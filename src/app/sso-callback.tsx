import { Redirect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

// Google / Apple come back to amedias://sso-callback. The auth session in src/api/auth.ts reads that URL;
// on Android it can also open this route, so send the person on to wherever the guards place them.
WebBrowser.maybeCompleteAuthSession();

export default function SsoCallback() {
  return <Redirect href="/" />;
}
