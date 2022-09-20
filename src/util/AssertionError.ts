export default class AssertionError extends Error {
  prop: object;

  constructor(msg: string, o: object) {
    super(msg);
    this.prop = o;
  }
}
