import { describe, it, expect } from 'vitest'
import { getComponentFailureRate } from './constants'

describe('getComponentFailureRate', () => {
  it('returns correct failure rate for known components', () => {
    expect(getComponentFailureRate('ENGINE-A')).toBe(0.03)
    expect(getComponentFailureRate('CHASSIS-PREMIUM')).toBe(0.015)
  })
})
