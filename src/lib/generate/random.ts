import Rand from 'rand-seed'

/**
 * Creates a random number generator with the given seed
 * @param seed Seed for the random number generator
 * @returns Object with methods for generating random numbers
 */
export const createRandom = (seed: string) => {
  const rng = new Rand(seed)

  return {
    /**
     * Generates a random integer between min and max (inclusive)
     * @param min Minimum value (inclusive)
     * @param max Maximum value (inclusive)
     * @returns Random integer
     */
    randomInt(min: number, max: number): number {
      min = Math.ceil(min)
      max = Math.floor(max)
      return Math.floor(rng.next() * (max - min + 1)) + min
    },

    /**
     * Generates a random float between min and max
     * @param min Minimum value (inclusive)
     * @param max Maximum value (exclusive)
     * @returns Random float
     */
    randomFloat(min: number, max: number): number {
      return rng.next() * (max - min) + min
    },
  }
}
