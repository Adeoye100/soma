/**
 * Security utilities for the frontend.
 */

/**
 * Displays a Self-XSS warning in the browser console.
 * This is a standard security measure used by large applications (e.g., Facebook, Discord)
 * to prevent users from pasting malicious code into the developer console.
 */
export const displaySelfXSSWarning = () => {
  // In development, we can still show it but maybe less prominently
  // or just show it in all environments to be safe
  const warningTitle = 'STOP!';
  const warningMessage = 'This is a browser feature intended for developers. If someone told you to copy and paste something here to enable a feature or "hack" someone\'s account, it is a scam and will give them access to your account.';
  const warningInstruction = 'See https://en.wikipedia.org/wiki/Self-XSS for more information.';

  console.log(
    `%c${warningTitle}`,
    'color: red; font-family: sans-serif; font-size: 4.5em; font-weight: bolder; text-shadow: #000 1px 1px;'
  );
  console.log(
    `%c${warningMessage}`,
    'font-family: sans-serif; font-size: 1.5em; font-weight: bold;'
  );
  console.log(
    `%c${warningInstruction}`,
    'font-family: sans-serif; font-size: 1.2em;'
  );
};
