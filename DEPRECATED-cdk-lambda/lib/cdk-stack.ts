import { CfnOutput, Stack, StackProps, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3_deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { AuthType } from 'aws-cdk-lib/aws-stepfunctions-tasks';

export class CdkOpenAiBot extends Stack {
  constructor(
    scope: Construct,
    id: string,
    deploymentEnvironment: string,
    mainResourcesName: string,
    props?: StackProps
  ) {
    super(scope, id, props);

    // Main variables based on environment variables and fixed values
    const bucketName = `taxbot-${Stack.of(this).account}`;

    // Obtain extra IDs/variables from SSM Parameters
    const openAIKey = ssm.StringParameter.valueFromLookup(this, `/${mainResourcesName}/${deploymentEnvironment}/openai-key`);

    // Create S3 bucket for added the source code and generating the CSV files
    const bucket = new s3.Bucket(this, "BucketMain", {
      bucketName: bucketName,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      accessControl: s3.BucketAccessControl.PRIVATE,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      enforceSSL: true,
      // autoDeleteObjects: true,  // Enable force delete of objects when deleting stack
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Add code to S3 bucket (to download it from EC2 instances)
    const _s3DeployFiles1 = new s3_deploy.BucketDeployment(this, "BucketDeployFilesSrc", {
      sources: [s3_deploy.Source.asset("../src")],
      destinationBucket: bucket,
      destinationKeyPrefix: "src",
    });
    const _s3DeployFiles2 = new s3_deploy.BucketDeployment(this, "BucketDeployFilesDatasets", {
      sources: [s3_deploy.Source.asset("../datasets")],
      destinationBucket: bucket,
      destinationKeyPrefix: "datasets",
    });

    // Role assumed by the Lambda
    const lambdaRole = new iam.Role(this, "Lambda-Role", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: `Lambda Function Role for ${mainResourcesName} solution`,
    });

    // Add extra IAM policies/actions based on Lambda requirements
    lambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
    )
    bucket.grantReadWrite(lambdaRole)

    // // Pandas Lambda Layer (for Python dependencies)
    // const lambdaLayerPandas = lambda.LayerVersion.fromLayerVersionArn(
    //   this,
    //   "Lambda-Layer-Pandas",
    //   "arn:aws:lambda:us-east-1:336392948345:layer:AWSSDKPandas-Python39:7"
    // );

    // OpenAI Lambda Layer (for Python dependencies)
    const lambdaLayerOpenAI = new lambda.LayerVersion(this, "Lambda-Layer-OpenAI", {
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_9],
      description: `Lambda Layer for Python dependencies for ${mainResourcesName} solution`,
      code: lambda.Code.fromAsset("../DEPRECATED-layer-openai/openai-aws-lambda-layer-3.9.zip"),
    });

    // // Extra Dependencies Lambda Layer (for Python dependencies)
    // const lambdaLayerExtras = new lambda.LayerVersion(this, "Lambda-Layer-Extras", {
    //   compatibleRuntimes: [lambda.Runtime.PYTHON_3_9],
    //   description: `Lambda Layer for Python dependencies for ${mainResourcesName} solution`,
    //   code: lambda.Code.fromAsset("../DEPRECATED-layer-extras"),
    // });

    // Lambda Function for the Backend of the OpenAI Chatbot
    const lambdaFunction = new lambda.Function(this, "Lambda-Function", {
      description: `Lambda Function for ${mainResourcesName} solution`,
      code: lambda.Code.fromAsset("../src"),
      handler: "openai_chatbot.chatbot_entrypoint",
      runtime: lambda.Runtime.PYTHON_3_9,
      timeout: Duration.seconds(60),
      memorySize: 3008,
      environment: {
        "BUCKET_NAME": bucket.bucketName,
        "OPENAI_KEY": openAIKey,
      },
      role: lambdaRole,
      layers: [lambdaLayerOpenAI],
      // layers: [lambdaLayerPandas, lambdaLayerOpenAI],
    });

    // Add Lambda Function URL to be able to request it via HTTPS endpoint
    const lambdaFunctionUrl = lambdaFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    // CloudFormation outputs for the deployment
    new CfnOutput(this, "LambdaFunctionUrl", {
      value: lambdaFunctionUrl.url,
      description: "URL to invoke Lambda Function",
    });

  }
}
