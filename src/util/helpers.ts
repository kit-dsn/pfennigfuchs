export function testEmail(email: string) {
    //RFC2822: https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript answer 3
    return /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(
        email
    );
}

export function testNumber(number: string) {
    //RFC3966: https://stackoverflow.com/questions/47568171/regex-improvements-for-international-common-and-rf3966-phone-number-validation
    return /^(?=(?:\+|0{2})?(?:(?:[(\-)./ \t\f]*\d){7,10})?(?:[-./ \t\f]?\d{2,3})(?:[-\s]?[ext]{1,3}[-./ \t\f]?\d{1,4})?$)((?:\+|0{2})\d{0,3})?(?:[-./ \t\f]?)(\(0\d[ ]?\d{0,4}\)|\(\d{0,4}\)|\d{0,4})(?:[-./ \t\f]{0,2}\d){3,8}(?:[-\s]?(?:x|ext)[-\t\f ]?(\d{1,4}))?$/.test(
        number
    );
}

// depending on the timestamp being on the same day, display only the time or the date
export function formatTime(ts: number) {
    const tsD = new Date(ts);
    const d = new Date();
    if (tsD.toDateString() === d.toDateString()) {
        const m = tsD.getMinutes();
        const minutes = m < 10 ? `0${m}` : m;
        return `${tsD.getHours()}:${minutes}`;
    } else {
        return tsD.toLocaleDateString();
    }
}

export function defined<T>(obj?: T): T {
    if (obj === undefined || obj === null) {
      throw new Error("nonNull runtime checked failed");
    }
    const o: T = obj;
    return o;
  }
  
  export function isNonNull<T>(obj: T | null): obj is T {
    return obj !== null ? true : false;
  }
  
  export function one<T>(arr: T[], errmsg: string): T {
    if (arr.length !== 1) {
      throw new Error(`illegal state (one): ${errmsg} length=${arr.length}`);
    }
    const t: T = arr[0];
    return t;
  }
  
  export function filterMaybeOne<T, S extends T>(
    arr: T[],
    func: (t: T) => t is S,
    errmsg: string
  ): S | undefined {
    const res = arr.filter(func);
    if (res.length > 1) {
      throw new Error(`illegal state (filterOne): ${errmsg} length${res.length}`);
    }
    const t: S = res[0];
    return t;
  }
  
  /*
  function assertFinNumberFormat(n: string) {
    if (!/^[-+]?\d+$/.test(n)) {
      throw new Error("number format");
    }
  }
  
  export function finAdd(n1: string, n2: string): string {
    assertFinNumberFormat(n1);
    assertFinNumberFormat(n2);
  
    const _n1 = Number.parseInt(n1, 10);
    const _n2 = Number.parseInt(n2, 10);
  
    if (
      Number.isNaN(_n1) ||
      !Number.isSafeInteger(_n1) ||
      Number.isNaN(_n2) ||
      !Number.isSafeInteger(_n2)
    ) {
      throw new Error("js integer overflow");
    }
  
    if (
      (_n2 > 0 && _n1 > Number.MAX_SAFE_INTEGER - _n2) ||
      (_n2 < 0 && _n1 < Number.MIN_SAFE_INTEGER - _n2)
    ) {
      throw new Error("js integer overflow");
    }
  
    const res = _n1 + _n2;
  
    if (!Number.isSafeInteger(res)) {
      throw new Error("js integer overflow");
    }
  
    return (_n1 + _n2).toString();
  }
  */
  
  export function splitMXCUrl(mxcUrl: string): [string, string] {
    const re = /^mxc:\/\/(?<domain>[^/]+)\/(?<path>.+)$/;
    const m = mxcUrl.match(re);
    if (m && m.groups?.domain && m.groups?.path) {
      return [m.groups.domain, m.groups.path];
    } else {
      throw new Error("illegal mxc url");
    }
  }
  
  export function splitMatrixId(matrixId?: string): [string,string] {
    const re = /^@(?<userid>[^:]+):(?<domain>.+)$/;
    const m = matrixId?.match(re);
    if (m && m.groups?.userid && m.groups?.domain) {
      return [m.groups.userid, m.groups.domain];
    } else {
      throw new Error("illegal matrix id");
    }
  }
  
  // relative complement: B \ A
  export function setRelativeComplement<T>(s1: IterableIterator<T>, s2: IterableIterator<T>): Set<T> {
    const s2_ = new Set(s2);
    return new Set([...s1].filter(el => !s2_.has(el)));
  }
    