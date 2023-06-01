import { CfnOutput, Stack, StackProps, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3_deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticloadbalancing from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling'


// Used to load UserData Script
import * as fs from 'fs'

export class CdkOpenAiChatbot extends Stack {
  constructor(
    scope: Construct,
    id: string,
    deploymentEnvironment: string,
    mainResourcesName: string,
    props?: StackProps
  ) {
    super(scope, id, props);

    // Main variables based on environment variables and fixed values
    const albPort = 80;
    const applicationPort = 8080;
    const instanceType = "t3.xlarge";
    const bucketName = `${mainResourcesName}-${deploymentEnvironment}-${Stack.of(this).account}`;

    // Obtain extra IDs/variables from SSM Parameters
    const openAIKey = ssm.StringParameter.valueFromLookup(this, `/${mainResourcesName}/${deploymentEnvironment}/openai-key`);

    // EC2 instance AMI
    const ami = ec2.MachineImage.latestAmazonLinux({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
    });

    // Use the default VPC for deploying the EC2 instances
    const vpc = ec2.Vpc.fromLookup(this, "VPC", { isDefault: true });

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

    // Role assumed by the EC2 (Instance Profile Role)
    const instanceRole = new iam.Role(this, "EC2-Role", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      description: `Instance Profile Role for the EC2 for ${mainResourcesName} solution`,
    });

    // Add extra IAM policies/actions based on EC2 requirements
    bucket.grantReadWrite(instanceRole)
    instanceRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("EC2InstanceConnect"))
    instanceRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"))
    instanceRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchAgentServerPolicy"))

    // Create Application load balancer (ALB)
    const alb = new elasticloadbalancing.ApplicationLoadBalancer(this, "ALB", {
      vpc: vpc,
      vpcSubnets: { subnets: vpc.publicSubnets },
      internetFacing: true,
    });

    // ALB Security Group to allow access to the ALB on required port
    const albSG = new ec2.SecurityGroup(this, "SG-ALB", {
      vpc: vpc,
      allowAllOutbound: true,
    });
    albSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(albPort),
      "Allow HTTPS traffic to ALB"
    );

    alb.connections.addSecurityGroup(albSG);

    // Security group to allow connections from the application load balancer to the EC2
    const albToEc2SG = new ec2.SecurityGroup(this, "SG-ALB-EC2", {
      vpc: vpc,
      allowAllOutbound: true,
    });
    albToEc2SG.connections.allowFrom(
      albSG,
      ec2.Port.tcp(applicationPort),
      "ALB to EC2 SG Connections for Application Port"
    );
    // // Note: uncomment these lines if we want SSH EC2 Instance Connect access
    // albToEc2SG.addIngressRule(
    //   ec2.Peer.anyIpv4(),  // TODO: Update to AWS range only
    //   ec2.Port.tcp(22),
    //   "Allow SSH to EC2 instances"
    // );

    // Configure ALB Listener for the desired port
    const listener = alb.addListener("ALB-Listener", {
      open: true,
      port: albPort,
      protocol: elasticloadbalancing.ApplicationProtocol.HTTP,
    });

    // Create EC2 ASG
    const asg = new autoscaling.AutoScalingGroup(this, "AutoScalingGroup", {
      vpc,
      instanceType: new ec2.InstanceType(instanceType),
      machineImage: ami,
      allowAllOutbound: true,
      role: instanceRole,
      healthCheck: autoscaling.HealthCheck.ec2(),
      minCapacity: 1,
      maxCapacity: 1,
      desiredCapacity: 1,
      securityGroup: albToEc2SG,
    });

    asg.addUserData(`echo export OPENAI_KEY=${openAIKey} >> /etc/profile`);
    asg.addUserData(`echo export BUCKET_NAME=${bucket.bucketName} >> /etc/profile`);
    asg.addUserData(`echo export ENVIRONMENT=${deploymentEnvironment} >> /etc/profile`);
    asg.addUserData(
      fs.readFileSync("./lib/user_data_script.sh", "utf8"),
    )

    // Link ASG (EC2 instances) to the ALB Target group
    listener.addTargets('ALB-Listener-TargetGroup', {
      port: applicationPort,
      protocol: elasticloadbalancing.ApplicationProtocol.HTTP,
      targets: [asg],
      healthCheck: {
        path: "/status",
        port: String(applicationPort),
        timeout: Duration.seconds(10),
        interval: Duration.minutes(5),
      },
    });

    // Generate SSM Parameter for sharing ALB DNS
    new ssm.StringParameter(this, 'SSM-Parameter-AlbDns', {
      parameterName: `/${mainResourcesName}/${deploymentEnvironment}/api-endpoint`,
      stringValue: alb.loadBalancerName,
    });

    // CloudFormation outputs for the deployment
    new CfnOutput(this, "AlbDns", {
      value: alb.loadBalancerDnsName,
      description: "API ALB DNS",
    });

  }
}
