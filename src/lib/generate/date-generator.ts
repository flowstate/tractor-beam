import { addDays, addYears, differenceInDays } from 'date-fns'

/**
 * Generates an array of dates spanning a specified number of years
 * with exactly one entry per calendar day, avoiding DST issues
 */
export function generateDatesForYears(
  startDate: Date,
  numberOfYears: number
): Date[] {
  // Create clean UTC date at the start
  const cleanStart = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate()
    )
  )

  // Calculate end date (last day of the period)
  const endDate = addDays(addYears(cleanStart, numberOfYears), -1)

  // Calculate total days needed
  const totalDays = differenceInDays(endDate, cleanStart) + 1

  // Generate one date per calendar day using UTC to avoid DST issues
  const dates: Date[] = []
  let currentDate = new Date(cleanStart)

  for (let i = 0; i < totalDays; i++) {
    // Store a clean copy of the current date
    dates.push(
      new Date(
        Date.UTC(
          currentDate.getUTCFullYear(),
          currentDate.getUTCMonth(),
          currentDate.getUTCDate()
        )
      )
    )

    // Advance to next day using UTC methods directly instead of date-fns
    // This avoids DST issues by working purely with UTC dates
    currentDate = new Date(
      Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate() + 1
      )
    )
  }

  return dates
}
