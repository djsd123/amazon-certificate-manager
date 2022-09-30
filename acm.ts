import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { Utils } from "./utils";

const config = new pulumi.Config("amazon-certificate-manager");
const domain = config.require("domain");
const cloudFront = config.requireBoolean('cloudFront')
const ireland = aws.Region.EUWest1
const nVirginia = aws.Region.USEast1

const provider = new aws.Provider("provider", {
    profile: aws.config.profile,
    region: cloudFront ? nVirginia : ireland,
});

const ttl = 60 * 10; // Ten minutes
const domainParts = Utils.getDomainAndSubDomain(domain);

const certificate = new aws.acm.Certificate("certificate", {
    domainName: domain,
    validationMethod: "DNS",
    subjectAlternativeNames: [
        // Subject Alternative Names (SANs) cannot end with a period
        domainParts.parentDomain.slice(0, -1),
        `*.${domainParts.parentDomain}`.slice(0, -1)
    ],
}, { provider: provider });

const hostedZoneId = aws.route53.getZone({
    name: domainParts.parentDomain,
}, { async: true }).then(zone => zone.zoneId);

/**
 *  Create a DNS record to prove that we _own_ the domain we're requesting a certificate for.
 *  See https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-validate-dns.html for more info.
 */

const certificateValidationDomain = new aws.route53.Record(`${domain}-validation`, {
    name: certificate.domainValidationOptions[0].resourceRecordName,
    zoneId: hostedZoneId,
    type: certificate.domainValidationOptions[0].resourceRecordType,
    records: [certificate.domainValidationOptions[0].resourceRecordValue],
    ttl: ttl,
});

const certificateValidationSAN = new aws.route53.Record(`${domain}-validation-SAN`, {
    name: certificate.domainValidationOptions[1].resourceRecordName,
    zoneId: hostedZoneId,
    type: certificate.domainValidationOptions[1].resourceRecordType,
    records: [certificate.domainValidationOptions[1].resourceRecordValue],
    ttl: ttl,
});

const certificateValidationApiSAN = new aws.route53.Record(`api.${domainParts.parentDomain}-validation-SAN`,{
    name: certificate.domainValidationOptions[2].resourceRecordName,
    zoneId: hostedZoneId,
    type: certificate.domainValidationOptions[2].resourceRecordType,
    records: [certificate.domainValidationOptions[2].resourceRecordValue],
    ttl
})

/**
 * This is a _special_ resource that waits for ACM to complete validation via the DNS record
 * checking for a status of "ISSUED" on the certificate itself. No actual resources are
 * created (or updated or deleted).
 *
 * See https://www.terraform.io/docs/providers/aws/r/acm_certificate_validation.html for slightly more detail
 * and https://github.com/terraform-providers/terraform-provider-aws/blob/master/aws/resource_aws_acm_certificate_validation.go
 * for the actual implementation.
 */

new aws.acm.CertificateValidation("certificateValidation", {
    certificateArn: certificate.arn,
    validationRecordFqdns: [
        certificateValidationDomain.fqdn,
        certificateValidationSAN.fqdn,
        certificateValidationApiSAN.fqdn
    ],
}, { provider: provider });
