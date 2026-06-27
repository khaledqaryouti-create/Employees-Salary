/**
 * ═══════════════════════════════════════════════════════
 *  Deployment Configuration
 *  Edit this file to configure the system for each client
 *  environment. Do NOT hardcode these values anywhere else.
 * ═══════════════════════════════════════════════════════
 *
 * @type {{ port: number, basePath: string, host: string }}
 */
module.exports = {
  /**
   * Port the dev/production server listens on.
   * @example 3000 | 8080 | 443
   */
  port: 8080,

  /**
   * URL base path prefix for sub-path deployments.
   * Use '' (empty string) to serve from the root.
   * Must start with '/' if non-empty, no trailing slash.
   * @example '' | '/hr-system' | '/payroll'
   */
  basePath: '',

  /**
   * Protocol + hostname with no trailing slash.
   * Used to build auth callback URLs and server action allowed origins.
   * @example 'http://localhost' | 'https://hr.acme.com'
   */
  host: 'http://localhost',
}
