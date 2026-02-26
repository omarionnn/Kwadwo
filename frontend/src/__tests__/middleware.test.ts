import middleware from "../middleware";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Mock @clerk/nextjs/server
jest.mock("@clerk/nextjs/server", () => {
    const mockMatcher = jest.fn();
    return {
        clerkMiddleware: jest.fn((handler) => handler), // return the inner function directly for testing
        createRouteMatcher: jest.fn(() => mockMatcher),
    };
});

describe("Clerk Middleware", () => {
    let mockProtect: jest.Mock;
    let mockAuth: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProtect = jest.fn();
        mockAuth = { protect: mockProtect };
    });

    it("should protect /dashboard routes", async () => {
        const { createRouteMatcher } = require("@clerk/nextjs/server");
        const mockMatcher = createRouteMatcher();
        mockMatcher.mockReturnValue(true); // Simulate a protected route match

        const req = { url: "http://localhost/dashboard", nextUrl: { pathname: "/dashboard" } } as any;

        // Since we mocked clerkMiddleware to return its argument, middleware is the handler itself
        await (middleware as any)(mockAuth, req);

        expect(mockMatcher).toHaveBeenCalledWith(req);
        expect(mockProtect).toHaveBeenCalled();
    });

    it("should allow public routes and not call protect", async () => {
        const { createRouteMatcher } = require("@clerk/nextjs/server");
        const mockMatcher = createRouteMatcher();
        mockMatcher.mockReturnValue(false); // Simulate a public route match

        const req = { url: "http://localhost/some-public-path", nextUrl: { pathname: "/some-public-path" } } as any;

        await (middleware as any)(mockAuth, req);

        expect(mockMatcher).toHaveBeenCalledWith(req);
        expect(mockProtect).not.toHaveBeenCalled();
    });
});
