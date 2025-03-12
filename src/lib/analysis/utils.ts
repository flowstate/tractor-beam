import * as ss from 'simple-statistics'

/**
 * Calculates the Pearson correlation coefficient between two arrays of numbers
 * @param x First array of values
 * @param y Second array of values
 * @returns Correlation coefficient between -1 and 1
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) {
    return 0
  }
  return ss.sampleCorrelation(x, y)
}

/**
 * Calculates the median value of an array of numbers
 * @param values Array of numbers
 * @returns Median value
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0
  return ss.median(values)
}

/**
 * Calculates the standard deviation of an array of numbers
 * @param values Array of numbers
 * @param mean Optional pre-calculated mean
 * @returns Standard deviation
 */
export function calculateStdDev(values: number[], mean?: number): number {
  if (values.length === 0) return 0

  if (mean !== undefined) {
    // Calculate standard deviation with a known mean
    // We need to manually calculate variance with the known mean
    const sumSquaredDeviations = values.reduce(
      (sum, value) => sum + Math.pow(value - mean, 2),
      0
    )
    return Math.sqrt(sumSquaredDeviations / values.length)
  } else {
    return ss.standardDeviation(values)
  }
}

/**
 * Extracts the quarter (1-4) from a Date object
 * @param date Date object
 * @returns Quarter (1-4)
 */
export function getQuarter(date: Date): number {
  const month = date.getMonth()
  return Math.floor(month / 3) + 1
}

/**
 * Groups an array of objects by a key function
 * @param array Array to group
 * @param keyFn Function that returns the key to group by
 * @returns Record mapping keys to arrays of objects
 */
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce(
    (result, item) => {
      const key = keyFn(item)
      if (!result[key]) {
        result[key] = []
      }
      result[key].push(item)
      return result
    },
    {} as Record<K, T[]>
  )
}

/**
 * Calculates the mean (average) of an array of numbers
 * @param values Array of numbers
 * @returns Mean value
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0
  return ss.mean(values)
}

/**
 * Calculates the variance of an array of numbers
 * @param values Array of numbers
 * @param mean Optional pre-calculated mean
 * @returns Variance
 */
export function calculateVariance(values: number[], mean?: number): number {
  if (values.length === 0) return 0

  if (mean !== undefined) {
    // Calculate variance with a known mean
    const sumSquaredDeviations = values.reduce(
      (sum, value) => sum + Math.pow(value - mean, 2),
      0
    )
    return sumSquaredDeviations / values.length
  } else {
    return ss.variance(values)
  }
}

/**
 * Calculates the quantiles of an array of numbers
 * @param values Array of numbers
 * @param p Quantile to calculate (0-1)
 * @returns Quantile value
 */
export function calculateQuantile(values: number[], p: number): number {
  if (values.length === 0) return 0
  return ss.quantile(values, p)
}

/**
 * Calculates the interquartile range (IQR) of an array of numbers
 * @param values Array of numbers
 * @returns IQR value
 */
export function calculateIQR(values: number[]): number {
  if (values.length === 0) return 0
  return ss.interquartileRange(values)
}

/**
 * Identifies outliers in an array of numbers using the 1.5 * IQR method
 * @param values Array of numbers
 * @returns Array of outlier values
 */
export function findOutliers(values: number[]): number[] {
  if (values.length === 0) return []

  const q1 = ss.quantile(values, 0.25)
  const q3 = ss.quantile(values, 0.75)
  const iqr = q3 - q1
  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr

  return values.filter((value) => value < lowerBound || value > upperBound)
}

/**
 * Performs linear regression on two arrays of numbers
 * @param x Independent variable values
 * @param y Dependent variable values
 * @returns Object with slope, intercept, and r-squared values
 */
export function linearRegression(
  x: number[],
  y: number[]
): {
  slope: number
  intercept: number
  rSquared: number
} {
  if (x.length !== y.length || x.length === 0) {
    return { slope: 0, intercept: 0, rSquared: 0 }
  }

  // Create array of [x,y] points with proper typing
  const points: Array<[number, number]> = x.map((xi, i) => [xi, y[i]])

  const regression = ss.linearRegression(points)

  // Create a line function using the slope and intercept
  const lineFunction = ss.linearRegressionLine(regression)

  // Calculate r-squared using the points and the line function
  const rSquared = ss.rSquared(points, lineFunction)

  return {
    slope: regression.m,
    intercept: regression.b,
    rSquared,
  }
}
