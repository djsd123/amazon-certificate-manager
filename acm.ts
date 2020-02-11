import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { Utils } from "./utils";
import {output} from "@pulumi/pulumi";

const config = new pulumi.Config("amazon-certificate-manager");
const domain = config.require("domain");

const usEast1Region = new aws.Provider("usEast", {
    profile: aws.config.profile,
    region: "us-east-1",
});

const ttl = 60 * 10; // Ten minutes
const domainParts = Utils.getDomainAndSubDomain(domain);

const certificate = new aws.acm.Certificate("certificate", {
    domainName: domain,
    validationMethod: "DNS",
    subjectAlternativeNames: [
        domainParts.parentDomain,
    ],
}, { provider: usEast1Region });

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

/**
 * This is a _special_ resource that waits for ACM to complete validation via the DNS record
 * checking for a status of "ISSUED" on the certificate itself. No actual resources are
 * created (or updated or deleted).
 *
 * See https://www.terraform.io/docs/providers/aws/r/acm_certificate_validation.html for slightly more detail
 * and https://github.com/terraform-providers/terraform-provider-aws/blob/master/aws/resource_aws_acm_certificate_validation.go
 * for the actual implementation.
 */

const certificateValidation = new aws.acm.CertificateValidation("certificateValidation", {
    certificateArn: certificate.arn,
    validationRecordFqdns: [
        certificateValidationDomain.fqdn,
        certificateValidationSAN.fqdn
    ],
}, { provider: usEast1Region });
