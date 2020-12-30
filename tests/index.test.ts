import { EventEmitter } from "events";
import { GoogleHome, HomeConfig } from "../src/index";

type MockAssistant = EventEmitter & { start: (...args: any[]) => void };

let mockAssistant: MockAssistant;
jest.mock("google-assistant", () => {
    const assistant = new EventEmitter();
    (assistant as MockAssistant).start = (args: any[]) => {
        return;
    };
    mockAssistant = assistant as MockAssistant;
    return () => assistant;
});

describe("@adam-chalmers/google-home @unit index.ts", () => {
    const config: HomeConfig = {
        keyFilePath: "",
        savedTokensPath: ""
    };

    let logSpy: jest.SpyInstance<void, any> | undefined;
    beforeEach(() => {
        logSpy = jest.spyOn(console, "log");
        logSpy.mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        logSpy = undefined;
        mockAssistant?.removeAllListeners();
    });

    it("Should initialise once the assistant is ready", async () => {
        const home = new GoogleHome(config);
        mockAssistant?.emit("ready");
        await expect(home.onInit).resolves.toEqual(undefined);
    });

    it("Should initialise if the assistant is ready before the timeout is up", async () => {
        const home = new GoogleHome({ ...config, timeout: 5000 });
        mockAssistant?.emit("ready");
        await expect(home.onInit).resolves.toEqual(undefined);
    });

    it("Should reject if the assistant isn't ready before the timeout is up", async () => {
        jest.useFakeTimers();

        const home = new GoogleHome({ ...config, timeout: 20 });
        jest.advanceTimersByTime(50);
        await expect(home.onInit).rejects.toThrowError();

        jest.useRealTimers();
    });

    it("Should log to the console if logOnReady is true", async () => {
        const home = new GoogleHome({ ...config, logOnReady: true });
        mockAssistant?.emit("ready");
        await home.onInit;

        expect(logSpy).toHaveBeenCalled();
    });

    it("Should not log to the console if logOnReady is false or undefined", async () => {
        let home = new GoogleHome(config);
        mockAssistant?.emit("ready");
        await home.onInit;
        expect(logSpy).not.toHaveBeenCalled();

        home = new GoogleHome({ ...config, logOnReady: false });
        mockAssistant?.emit("ready");
        await home.onInit;
        expect(logSpy).not.toHaveBeenCalled();
    });

    it("Should not do a thing", async () => {
        jest.useFakeTimers();

        const home = new GoogleHome({ ...config, timeout: 20 });
        const readySpy = jest.spyOn(home as any, "onAssistantReady");

        jest.advanceTimersByTime(50);
        mockAssistant?.emit("ready");
        expect(readySpy.mock.calls[0]).toEqual([true, undefined]);
    });

    it("Should send a message to the google home", async () => {
        const startSpy = jest.spyOn(mockAssistant, "start");

        const home = new GoogleHome(config);
        const message = "Do the thing.";
        home.sendMessage(message);
        expect(startSpy).toHaveBeenCalled();
    });
});
