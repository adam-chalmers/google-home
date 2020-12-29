import GoogleAssistant from "google-assistant";

// Would be nicer if these were exported from the google-assistant lib, but we can kinda hackily extract them here anyway for easier use
type ConversationConfig = Exclude<Parameters<GoogleAssistant["start"]>[0], undefined>;
type AuthConfig = ConstructorParameters<typeof GoogleAssistant>[0];

type EventEmitter = {
    emit(type: string, payload?: any): any;
    on(type: string, handler: Function): any;
};

type Conversation = EventEmitter & {
    write(bytes: Uint8Array): void;
    end(): void;
};

class GoogleHome {
    private readonly auth: AuthConfig;
    private readonly assistant: GoogleAssistant;

    constructor(auth: AuthConfig, logOnReady?: boolean) {
        this.auth = auth;
        const assistant = new GoogleAssistant(this.auth);
        this.assistant = assistant;

        this._onInit = new Promise((resolve, reject) => {
            assistant.on("ready", () => {
                if (logOnReady === true) {
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
        return new Promise<void>((resolve, reject) => {
            conversation
                .on("audio-data", (data: any) => {
                    // Do stuff with the audio data from the server
                    let foo = data;
                })
                .on("end-of-utterance", () => {
                    // Do stuff when done speaking to the assistant
                    let foo = 0;
                })
                .on("transcription", (data: any) => {
                    // Do stuff with the words you are saying to the assistant
                    let foo = data;
                })
                .on("response", (text: any) => {
                    // Do stuff with the text that the assistant said back
                    let foo = text;
                })
                .on("volume-percent", (percent: any) => {
                    // Do stuff with a volume percent change (range from 1-100)
                    let foo = percent;
                })
                .on("device-action", (action: any) => {
                    // If you've set this device up to handle actions, you'll get that here
                    let foo = action;
                })
                .on("screen-data", (screen: any) => {
                    // If the screen.isOn flag was set to true, you'll get the format and data of the output
                    let foo = screen;
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
    }

    public async sendMessage(message: string) {
        const config = this.createConversationConfig(message);
        const conversation = await this.startConversation(config);
        await this.handleResponse(conversation);
    }
}

export { GoogleHome, AuthConfig };
