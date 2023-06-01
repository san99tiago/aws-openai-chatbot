import { CfnOutput, Stack, StackProps, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3_deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as ssm from 'aws-cdk-lib/aws-ssm';


// Used to load UserData Script
import * as fs from 'fs'

export class CdkOpenAiFrontend extends Stack {
  constructor(
    scope: Construct,
    id: string,
    deploymentEnvironment: string,
    mainResourcesName: string,
    props?: StackProps
  ) {
    super(scope, id, props);

    // Main variables based on environment variables and fixed values
    const websiteBucketName = `${mainResourcesName}-${Stack.of(this).account}`;

    // Create S3 bucket for Static Website content
    const websiteBucket = new s3.Bucket(this, "BucketWebsite", {
      bucketName: websiteBucketName,
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      // autoDeleteObjects: true,  // Enable force delete of objects when deleting stack
      removalPolicy: RemovalPolicy.DESTROY,
      websiteIndexDocument: "index.html",
    });

    // Add code to S3 bucket (for Static Website Hosting)
    const _s3DeployFiles3 = new s3_deploy.BucketDeployment(this, "BucketDeployFilesStatic", {
      sources: [s3_deploy.Source.asset("../website")],
      destinationBucket: websiteBucket,
    });

    // CloudFormation outputs for the deployment
    new CfnOutput(this, "StaticWebsiteEndpoint", {
      value: websiteBucket.bucketWebsiteDomainName,
      description: "Endpoint for Static Website on S3",
    });

  }
}
