# Amazon-Certificate-Manager

### Provisions certificates with ACM

**Note**

The resulting certificate will be provisioned in the `us-east-1` region.  
This allows it to optionally be used with a [cloudfront](https://aws.amazon.com/cloudfront/) distribution.

See: [Terraform docs](https://www.terraform.io/docs/providers/aws/r/cloudfront_distribution.html#viewer-certificate-arguments)

#### Prerequisites

* [nodejs](https://nodejs.org/en/download/) or [yarn](https://classic.yarnpkg.com/en/docs/install)
* [pulumi](https://www.pulumi.com/docs/get-started/install/#install-pulumi)
* [typescript](https://www.typescriptlang.org/index.html#download-links)

#### Usage

First create yourself a stack file named `Pulumi<CHOOSE STACK NAME>.yaml` with the following contents
```yaml
config:
  aws:region: eu-west-1
  aws:profile: <YOUR PROFILE NAME>
  amazon-certificate-manager:domain: <YOUR SUBDOMAIN>

```

```bash
yarn install or npm install
```

```bash
pulumi up
```
