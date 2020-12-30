import GoogleAssistant from "google-assistant";
import { ConversationConfig } from "./types/conversationConfig";
import { HomeConfig } from "./types/homeConfig";

type EventEmitter = {
    emit(type: string, payload?: any): any;
    on(type: string, handler: (...args: any[]) => any): any;
};

type Conversation = EventEmitter & {
    write(bytes: Uint8Array): void;
    end(): void;
};

class GoogleHome {
    private readonly assistant: GoogleAssistant;

    constructor(config: HomeConfig) {
        const assistant = new GoogleAssistant({ keyFilePath: config.keyFilePath, savedTokensPath: config.savedTokensPath });
        this.assistant = assistant;

        this._onInit = new Promise((resolve, reject) => {
            // If a timeout length is specified, set up a timeout that rejects the promise if the google assistant doesn't respond with a "ready" event in time
            let timedOut = false;
            let timeout: NodeJS.Timeout | undefined = undefined;
            if (config.timeout != null) {
                timeout = setTimeout(() => {
                    timedOut = true;
                    reject(new Error("Google assistant instance failed to initialise in time"));
                }, config.timeout);
            }

            assistant.on("ready", () => {
                // If the promise has already been marked as timed out, then we know we've already rejected and shouldn't do any more
                if (timedOut) {
                    return;
                }

                // If a timeout is underway, clear it so that it doesn't cause a rejection since we're handling the "ready" event now
                if (timeout !== undefined) {
                    clearTimeout(timeout);
                }
                if (config.logOnReady === true) {
                    console.log("Assistant is ready!");
                }
                resolve();
            });
        });
    }

    private readonly _onInit: Promise<void>;
    public get onInit(): Promise<void> {
        return this._onInit;
    }

    private isError(obj: Conversation | Error): obj is Error {
        return (obj as Error)?.message ? true : false;
    }

    private createConversationConfig(text: string): ConversationConfig {
        return {
            audio: {
                encodingIn: "LINEAR16", // supported are LINEAR16 / FLAC (defaults to LINEAR16)
                sampleRateIn: 16000, // supported rates are between 16000-24000 (defaults to 16000)
                encodingOut: "LINEAR16", // supported are LINEAR16 / MP3 / OPUS_IN_OGG (defaults to LINEAR16)
                sampleRateOut: 24000 // supported are 16000 / 24000 (defaults to 24000)
            },
            lang: "en-AU", // language code for input/output (defaults to en-US)
            textQuery: text, // if this is set, audio input is ignored
            isNew: true // set this to true if you want to force a new conversation and ignore the old state
        };
    }

    /**
     * An async wrapper for this.assistant.start
     *
     * @param config The conversation configuration object
     */
    private async startConversation(config: ConversationConfig): Promise<Conversation> {
        return new Promise((resolve, reject) => {
            this.assistant.start(config, (obj) => {
                if (this.isError(obj)) {
                    reject(obj);
                } else {
                    resolve(obj);
                }
            });
        });
    }

    private async handleResponse(conversation: Conversation): Promise<void> {
        /*eslint-disable @typescript-eslint/no-unused-vars */
        return new Promise<void>((resolve, reject) => {
            conversation
                .on("audio-data", (data: any) => {
                    // Do stuff with the audio data from the server
                })
                .on("end-of-utterance", () => {
                    // Do stuff when done speaking to the assistant
                })
                .on("transcription", (data: any) => {
                    // Do stuff with the words you are saying to the assistant
                })
                .on("response", (text: any) => {
                    // Do stuff with the text that the assistant said back
                })
                .on("volume-percent", (percent: any) => {
                    // Do stuff with a volume percent change (range from 1-100)
                })
                .on("device-action", (action: any) => {
                    // If you've set this device up to handle actions, you'll get that here
                })
                .on("screen-data", (screen: any) => {
                    // If the screen.isOn flag was set to true, you'll get the format and data of the output
                })
                .on("ended", (error: any, continueConversation: boolean) => {
                    // Once the conversation is ended, see if we need to follow up
                    if (error) {
                        return reject(error);
                    } else if (continueConversation) {
                        this.assistant.start();
                    } else {
                        return resolve();
                    }
                })
                .on("error", (error: any) => {
                    return reject(error);
                });
        });
        /*eslint-enable @typescript-eslint/no-unused-vars */
    }

    public async sendMessage(message: string): Promise<void> {
        const config = this.createConversationConfig(message);
        const conversation = await this.startConversation(config);
        await this.handleResponse(conversation);
    }
}

export { GoogleHome, HomeConfig };
