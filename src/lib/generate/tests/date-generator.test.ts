import { describe, it, expect } from 'vitest'
import { generateDatesForYears } from '../date-generator'

describe('generateDatesForYears', () => {
  it('should generate exactly 3 years of dates with no duplicates or gaps', () => {
    // Start date: 2022-01-01
    const startDate = new Date(Date.UTC(2022, 0, 1))
    const numberOfYears = 3

    // Generate dates
    const dates = generateDatesForYears(startDate, numberOfYears)

    // Expected number of days:
    // 2022: 365 days (not leap year)
    // 2023: 365 days (not leap year)
    // 2024: 366 days (leap year)
    // Total: 1096 days
    const expectedDays = 365 + 365 + 366

    // Check total count
    expect(dates.length).toBe(expectedDays)

    // Check first and last dates
    expect(dates[0].toISOString().split('T')[0]).toBe('2022-01-01')
    expect(dates[dates.length - 1].toISOString().split('T')[0]).toBe(
      '2024-12-31'
    )

    // Check for duplicates by converting to date strings and using Set
    const dateStrings = dates.map((d) => d.toISOString().split('T')[0])
    const uniqueDateStrings = new Set(dateStrings)
    expect(uniqueDateStrings.size).toBe(expectedDays)

    // Check for gaps by verifying each consecutive date differs by exactly one day
    for (let i = 1; i < dates.length; i++) {
      const currentDay = dates[i].getTime()
      const previousDay = dates[i - 1].getTime()
      const diffInDays = (currentDay - previousDay) / (1000 * 60 * 60 * 24)
      expect(diffInDays).toBe(1)
    }

    // Verify February 29, 2024 exists (leap day)
    const leapDayExists = dateStrings.includes('2024-02-29')
    expect(leapDayExists).toBe(true)

    // Verify problematic DST transition dates are present
    // US DST transitions in 2022-2024 (second Sunday in March, first Sunday in November)
    const dstDates = [
      '2022-03-13',
      '2022-11-06',
      '2023-03-12',
      '2023-11-05',
      '2024-03-10',
      '2024-11-03',
    ]

    for (const dstDate of dstDates) {
      expect(dateStrings.includes(dstDate)).toBe(true)
    }
  })
})
