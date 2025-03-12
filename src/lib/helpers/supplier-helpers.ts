import type { SupplierId } from '../types/types'
import { SUPPLIERS } from '../constants'

export const supplierHelpers = {
  getBaseLeadTime: (supplierId: SupplierId): number => {
    return SUPPLIERS[supplierId].baseLeadTime
  },
}
