import { EventEmitter } from "events";
import { GoogleHome, HomeConfig } from "../src/index";
import { Conversation } from "../src/types/conversation";
import { ConversationConfig } from "../src/types/conversationConfig";

interface MockInstance extends EventEmitter {
    start: (config: ConversationConfig, callback: (obj: Error | Conversation) => void) => void;
    write: (bytes: Uint8Array) => void;
    end: () => void;
}

let mockAssistant: MockInstance;
let startCallbackArg: Error | Conversation;
let endConversation: (conversation: Conversation) => void;
jest.mock("google-assistant", () => {
    class MockEmitter extends EventEmitter {
        public start(config: ConversationConfig, callback: (obj: Error | Conversation) => void): void {
            callback(startCallbackArg);
        }

        public write(bytes: Uint8Array): void {
            return;
        }

        public end(): void {
            return;
        }
    }

    mockAssistant = new MockEmitter();
    return () => mockAssistant;
});

describe("@adam-chalmers/google-home @unit index.ts", () => {
    const config: HomeConfig = {
        keyFilePath: "",
        savedTokensPath: ""
    };

    let home: GoogleHome;
    function setup(config: HomeConfig): void {
        home = new GoogleHome(config);
        const original = home["handleResponse"];
        jest.spyOn(home as any, "handleResponse").mockImplementation(((conversation: Conversation) => {
            const promise = original.bind(home)(conversation);
            endConversation(conversation);
            return promise;
        }) as any);
    }

    let logSpy: jest.SpyInstance<void, any> | undefined;
    beforeEach(() => {
        startCallbackArg = mockAssistant;
        endConversation = (conversation) => conversation.emit("ended", undefined);

        logSpy = jest.spyOn(console, "log");
        logSpy.mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        logSpy = undefined;
        mockAssistant?.removeAllListeners();
    });

    it("Should initialise once the assistant is ready", async () => {
        setup(config);
        mockAssistant.emit("ready");
        await expect(home.onInit).resolves.toEqual(undefined);
    });

    it("Should initialise if the assistant is ready before the timeout is up", async () => {
        setup({ ...config, timeout: 5000 });
        mockAssistant.emit("ready");
        await expect(home.onInit).resolves.toEqual(undefined);
    });

    it("Should reject if the assistant isn't ready before the timeout is up", async () => {
        jest.useFakeTimers();

        setup({ ...config, timeout: 20 });
        jest.advanceTimersByTime(50);
        // Emit the ready event to make sure that we've still rejected despite receiving the ready event
        mockAssistant.emit("ready");
        await expect(home.onInit).rejects.toThrowError();

        jest.useRealTimers();
    });

    it("Should log to the console if logOnReady is true", async () => {
        setup({ ...config, logOnReady: true });
        mockAssistant.emit("ready");
        await home.onInit;

        expect(logSpy).toHaveBeenCalled();
    });

    it("Should not log to the console if logOnReady is false or undefined", async () => {
        setup(config);
        mockAssistant.emit("ready");
        await home.onInit;
        expect(logSpy).not.toHaveBeenCalled();

        home = new GoogleHome({ ...config, logOnReady: false });
        mockAssistant?.emit("ready");
        await home.onInit;
        expect(logSpy).not.toHaveBeenCalled();
    });

    it("Should send a message to the google home", async () => {
        setup(config);
        const startSpy = jest.spyOn(mockAssistant, "start");
        const message = "Do the thing.";
        await home.sendMessage(message);
        expect(startSpy).toHaveBeenCalledTimes(1);
        expect(startSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                textQuery: message
            }),
            expect.any(Function)
        );
    });

    it("Should throw an error if an error occurs while starting the conversation", async () => {
        setup(config);
        startCallbackArg = new Error("Test error");
        await expect(home.sendMessage("")).rejects.toThrow();
    });

    it("Should throw an error if an error occurs during the conversation", async () => {
        setup(config);
        endConversation = (conversation) => conversation.emit("ended", new Error("Test error"));
        await expect(home.sendMessage("")).rejects.toThrow();
    });

    it("Should call the start function again if prompted to continue the conversation", async () => {
        setup(config);
        endConversation = (conversation) => {
            // Immediately change the function after the first call so that we don't continue endlessly
            endConversation = (conversation) => conversation.emit("ended", undefined, false);
            // Emit the "ended" event but flag it for continuation
            conversation.emit("ended", undefined, true);
        };

        const startSpy = jest.spyOn(home as any, "startConversation");
        await home.sendMessage("");

        // Start spy should've been called twice - once that is marked for continuation, and then a second, final time
        expect(startSpy).toBeCalledTimes(2);
    });

    it("Should throw an error if the conversation results in an error", async () => {
        setup(config);
        endConversation = (conversation) => conversation.emit("error", new Error("Test error"));

        await expect(home.sendMessage("")).rejects.toThrow();
    });
});
