/**
 * This single import is enough to demonstrate skipLibCheck's impact.
 *
 * @aws-sdk/client-s3 ships thousands of lines of generated .d.ts -
 * every operation's input/output shapes, unions, and enums. With
 * skipLibCheck: false, TypeScript fully type-checks all of it on every
 * build even though none of it is code you wrote or can fix.
 */

import { S3Client } from "@aws-sdk/client-s3";

const client = new S3Client({});

export { client };
