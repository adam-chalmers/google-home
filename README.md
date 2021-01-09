# Google Home

A simple package for sending messages to a Google Home on the local network that wraps the [google-assistant](https://www.npmjs.com/package/google-assistant) library for ease of use.

### Installation

To use this package, you'll need to do some additional setup. Follow the installation instructions [here](https://www.npmjs.com/package/google-assistant#installation) to get started.

### Usage

To use this package, simply import the package and instantiate the class with the required configuration:
```
import { GoogleHome } from "@adam-chalmers/google-home";

const homeConfig = {
    keyFilePath: "YOUR_API_KEY_FILE_PATH.json",
    savedTokensPath: "YOUR_TOKENS_FILE_PATH.json"
};
const home = new GoogleHome(homeConfig);
```

### Typescript

For TypeScript users, this package also exports the `GoogleHomeConfig` interface to make setup easier.