import { describe, expect, it } from "vitest";
import { defined, filterMaybeOne, formatTime, isNonNull, one, setRelativeComplement, splitMatrixId, splitMXCUrl, testEmail, testNumber } from "../helpers";

describe("Tests for auxiliary utilities", () => {
  /*
  it("check financial arithmetic parsing", () => {
    expect(() => finAdd("0", "0.1")).toThrowError(new Error("number format"));
    expect(() => finAdd("0.1", "0")).toThrowError(new Error("number format"));
    expect(() => finAdd("a", "0")).toThrowError(new Error("number format"));
    expect(() => finAdd("0", "a")).toThrowError(new Error("number format"));
  });
  */

  /*
  it("check financial arithmetic addition", () => {
    expect(finAdd("0", "0")).toBe("0");
    expect(finAdd("1", "-1")).toBe("0");

    expect(finAdd(Number.MAX_SAFE_INTEGER.toString(), "0")).toBe(
      Number.MAX_SAFE_INTEGER.toString()
    );
    expect(finAdd("0", Number.MAX_SAFE_INTEGER.toString())).toBe(
      Number.MAX_SAFE_INTEGER.toString()
    );

    expect(() => finAdd(Number.MAX_SAFE_INTEGER.toString(), "1")).toThrowError(
      new Error("js integer overflow")
    );
    expect(() => finAdd("1", Number.MAX_SAFE_INTEGER.toString())).toThrowError(
      new Error("js integer overflow")
    );
    expect(() => finAdd(Number.MIN_SAFE_INTEGER.toString(), "-1")).toThrowError(
      new Error("js integer overflow")
    );
    expect(() => finAdd("-1", Number.MIN_SAFE_INTEGER.toString())).toThrowError(
      new Error("js integer overflow")
    );

    expect(() => finAdd(Number.MAX_VALUE.toString(), "0")).toThrowError(
      new Error("number format")
    );
    expect(() =>
      finAdd(Math.floor(Number.MAX_VALUE).toString(), "0")
    ).toThrowError(new Error("number format"));

    expect(finAdd("0", "023")).toBe("23");
  });
  */

  it("splitMatrix", () => {
    expect(() => splitMXCUrl("")).toThrowError();
    expect(() => splitMXCUrl("mxc://")).toThrowError();
    expect(() => splitMXCUrl("mxc:///")).toThrowError();
    expect(() => splitMXCUrl("mxc://a/")).toThrowError();
    expect(splitMXCUrl("mxc://a/b")).toStrictEqual(["a","b"]);
  });

  it("setRelativeComplement", () => {
    expect(setRelativeComplement<number>([].values(), [].values())).toStrictEqual(new Set([]));
    expect(setRelativeComplement<number>([1].values(), [1].values())).toStrictEqual(new Set([]));
    expect(setRelativeComplement<number>([1].values(), [2].values())).toStrictEqual(new Set([1]));
    expect(setRelativeComplement<number>([2].values(), [1].values())).toStrictEqual(new Set([2]));
    expect(setRelativeComplement<number>([1,2,3,4,5,6].values(), [4,5,6].values())).toStrictEqual(new Set([1,2,3]));
    expect(setRelativeComplement<number>([1,2,3,4,5,6].values(), [1,4,5,6].values())).toStrictEqual(new Set([2,3]));
    expect(setRelativeComplement<number>([1,2,3].values(), [4,5,6].values())).toStrictEqual(new Set([1,2,3]));
  });

  it("defined", () => {
    expect(() => defined(undefined)).toThrowError();
  });

  it("nonNull", () => {
    expect(isNonNull(null)).toStrictEqual(false);
    expect(isNonNull("1")).toStrictEqual(true);
  });

  it("one", () => {
    expect(one([1], "foo")).toStrictEqual(1);
    expect(() => one([], "foo")).toThrowError();
    expect(() => one([1,2], "foo")).toThrowError();
  });

  it("filterMaybeOne", () => {
    function isOne(el: number): el is number {
      return el === 1;
    }
    expect(filterMaybeOne([1,2,3], isOne, "foo")).toStrictEqual(1);
    expect(() => filterMaybeOne([1,1,2,3], isOne, "foo")).toThrowError();
    expect(filterMaybeOne([], isOne, "foo")).toStrictEqual(undefined);
  });

  it("test emails", () => {
    expect(testEmail("")).toStrictEqual(false);
    expect(testEmail("a@b.com")).toStrictEqual(true);
    expect(testEmail("a")).toStrictEqual(false);
    expect(testEmail("a@b.c.com")).toStrictEqual(true);
    expect(testEmail("a.b@c.d.g")).toStrictEqual(true);
  });

  it("test numbers", () => {
    expect(testNumber("")).toStrictEqual(false);
    expect(testNumber("a")).toStrictEqual(false);
    expect(testNumber("+49 1234 567890")).toStrictEqual(true); // german 1
    expect(testNumber("0123 4567890")).toStrictEqual(true); // german 2
    expect(testNumber("415 555-2671")).toStrictEqual(true); // US 1
    expect(testNumber("(415) 555-2671")).toStrictEqual(true); // US 2
  });

  it("format time", () => {
    expect(formatTime(0)).toStrictEqual(new Date(0).toLocaleDateString());
    const beginningOfDay = new Date();
    beginningOfDay.setHours(0,0);
    expect(formatTime(beginningOfDay.getTime())).toStrictEqual(`${beginningOfDay.getHours()}:0${beginningOfDay.getMinutes()}`);
    const endOfDay = new Date();
    endOfDay.setHours(23,59);
    expect(formatTime(endOfDay.getTime())).toStrictEqual(`${endOfDay.getHours()}:${endOfDay.getMinutes()}`);
    const yesterday = new Date();
    yesterday.setTime(yesterday.getTime() - 24*60*60*1000)
    expect(formatTime(yesterday.getTime())).toStrictEqual(yesterday.toLocaleDateString());
  })

  it("split matrix id", () => {
    expect(() => splitMatrixId("")).toThrowError();
    expect(splitMatrixId("@test_pse_2022:matrix.org")).toStrictEqual(["test_pse_2022", "matrix.org"]);
  });
});
