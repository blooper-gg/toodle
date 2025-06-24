/**
 * A simple pool for creating and reusing objects to avoid allocation between frames
 *
 * @example
 *
 * const pool = new Pool(() => new SomeObject(), 10);
 *
 * function animate() {
 *   const obj = pool.get();
 *   console.log(obj);
 *   pool.free();
 *   requestAnimationFrame(animate);
 * }
 *
 * requestAnimationFrame(animate);
 */
export class Pool<T> {
  #items: T[] = [];
  #create: () => T;
  #index = 0;

  constructor(create: () => T, initialSize = 0) {
    this.#create = create;
    if (initialSize > 0) {
      this.#items = Array.from({ length: initialSize })
        .fill(null)
        .map(() => this.#create());
    }
  }

  get() {
    if (this.#index >= this.#items.length) {
      this.#items.push(this.#create());
    }

    return this.#items[this.#index++];
  }

  free() {
    this.#index = 0;
  }
}
