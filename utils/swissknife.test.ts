import * as SwissKnife from './swissknife';

// filter_empty()
test("[Filter Empty] No data passed.", () => {
    expect(SwissKnife.filter_empty([])).toEqual([]);
});
test("[Filter Empty] Undefined data and null", () => {
    expect(SwissKnife.filter_empty(null)).toEqual([]);
})
test("[Filter Empty] One data passed.", () => {
    expect(SwissKnife.filter_empty(["one"])).toEqual(["one"]);
});
test("[Filter Empty] Multiple data passed.", () => {
    expect(SwissKnife.filter_empty(["one", "test", "pog"])).toStrictEqual(["one", "test", "pog"]);
});
test("[Filter Empty] Multiple data passed (with one empty data).", () => {
    expect(SwissKnife.filter_empty(["one", "test", "", "pog"])).toStrictEqual(["one", "test", "pog"]);
});

// hasKey()
test("[Has Key] Undefined data passed.", () => {
    expect(SwissKnife.hasKey(null, "id")).toStrictEqual(false);
    expect(SwissKnife.hasKey(undefined, "id")).toStrictEqual(false);
})
test("[Has Key] Empty data passed.", () => {
    expect(SwissKnife.hasKey({}, "id")).toStrictEqual(false);
})
test("[Has Key] Data passed. --> {data: 'test'} get `id`", () => {
    expect(SwissKnife.hasKey({data: "test"}, "id")).toStrictEqual(false);
})
test("[Has Key] Data passed. --> {data: 'test', id: 123} get `id`", () => {
    expect(SwissKnife.hasKey({data: "test", id: 123}, "id")).toStrictEqual(true);
})

// is_none()
test("[Is NoneType] Normal datatype passed. (Should be `false`) ", () => {
    expect(SwissKnife.is_none(["data", "y"])).toStrictEqual(false);
    expect(SwissKnife.is_none({data: "y"})).toStrictEqual(false);
    expect(SwissKnife.is_none(true)).toStrictEqual(false);
    expect(SwissKnife.is_none(false)).toStrictEqual(false);
    expect(SwissKnife.is_none("test")).toStrictEqual(false);
    expect(SwissKnife.is_none(123)).toStrictEqual(false);
})
test("[Is NoneType] NoneType (Undefined, null) (Should be `true`) ", () => {
    expect(SwissKnife.is_none(undefined)).toStrictEqual(true);
    expect(SwissKnife.is_none(null)).toStrictEqual(true);
})

// Map boolean.
test("[Map to Boolean] Null data. (Should be `false`)", () => {
    expect(SwissKnife.map_bool(null)).toStrictEqual(false);
})
test("[Map to Boolean] Undefined data. (Should be `false`)", () => {
    expect(SwissKnife.map_bool(undefined)).toStrictEqual(false);
})
test("[Map to Boolean] Passed a string that is 'n' (Should be `false`)", () => {
    expect(SwissKnife.map_bool("n")).toStrictEqual(false);
    expect(SwissKnife.map_bool("N")).toStrictEqual(false);
    expect(SwissKnife.map_bool("no")).toStrictEqual(false);
    expect(SwissKnife.map_bool("NO")).toStrictEqual(false);
    expect(SwissKnife.map_bool("disable")).toStrictEqual(false);
    expect(SwissKnife.map_bool("false")).toStrictEqual(false);
    expect(SwissKnife.map_bool("0")).toStrictEqual(false);
    expect(SwissKnife.map_bool(0)).toStrictEqual(false);
})
test("[Map to Boolean] Passed a string that is 'y' (Should be `true`)", () => {
    expect(SwissKnife.map_bool("y")).toStrictEqual(true);
    expect(SwissKnife.map_bool("Y")).toStrictEqual(true);
    expect(SwissKnife.map_bool("yes")).toStrictEqual(true);
    expect(SwissKnife.map_bool("YES")).toStrictEqual(true);
    expect(SwissKnife.map_bool("enable")).toStrictEqual(true);
    expect(SwissKnife.map_bool("true")).toStrictEqual(true);
    expect(SwissKnife.map_bool("1")).toStrictEqual(true);
    expect(SwissKnife.map_bool(1)).toStrictEqual(true);
})