import * as Filters from "./filters";

// Test group check
describe("Get Group dataset", () => {
    test("Data passed, but it's not on list.", () => {
        expect(Filters.getGroup("unknown_group")).toEqual(["unknown_group"]);
    });
    test("Data passed, and it's on list.", () => {
        expect(Filters.getGroup("nijisanji")).toEqual(Filters.GROUPS_MAPPINGS["nijisanji"]);
    });
});