import middleware from "../middleware";
import { createRouteMatcher } from "@clerk/nextjs/server";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockAuth: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProtect = jest.fn();
        mockAuth = { protect: mockProtect };
    });

    it("should protect /dashboard routes", async () => {
        const mockMatcher = createRouteMatcher(["/dashboard(.*)"]) as unknown as jest.Mock;
        mockMatcher.mockReturnValue(true); // Simulate a protected route match

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const req = { url: "http://localhost/dashboard", nextUrl: { pathname: "/dashboard" } } as any;

        // Since we mocked clerkMiddleware to return its argument, middleware is the handler itself
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (middleware as any)(mockAuth, req);

        expect(mockMatcher).toHaveBeenCalledWith(req);
        expect(mockProtect).toHaveBeenCalled();
    });

    it("should allow public routes and not call protect", async () => {
        const mockMatcher = createRouteMatcher(["/dashboard(.*)"]) as unknown as jest.Mock;
        mockMatcher.mockReturnValue(false); // Simulate a public route match

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const req = { url: "http://localhost/some-public-path", nextUrl: { pathname: "/some-public-path" } } as any;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (middleware as any)(mockAuth, req);

        expect(mockMatcher).toHaveBeenCalledWith(req);
        expect(mockProtect).not.toHaveBeenCalled();
    });
});
