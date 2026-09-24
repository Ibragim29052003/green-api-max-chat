export const normalizePhone = (value: string): string => {
  const digits = value.replace(/\D/g, '')

  if (digits.length === 10) {
    return `7${digits}`
  }

  if (digits.length === 11 && digits.startsWith('8')) {
    return `7${digits.slice(1)}`
  }

  return digits
}

export const isSupportedPhone = (phone: string): boolean =>
  (phone.startsWith('7') && phone.length === 11) ||
  (phone.startsWith('375') && phone.length === 12)

const appendGroups = (
  prefix: string,
  subscriber: string,
  areaLength: number,
): string => {
  let result = prefix
  const area = subscriber.slice(0, areaLength)
  const first = subscriber.slice(areaLength, areaLength + 3)
  const second = subscriber.slice(areaLength + 3, areaLength + 5)
  const third = subscriber.slice(areaLength + 5, areaLength + 7)

  if (area) result += ` (${area}`
  if (area.length === areaLength) result += ')'
  if (first) result += ` ${first}`
  if (second) result += `-${second}`
  if (third) result += `-${third}`

  return result
}

export const formatPhoneInput = (value: string): string => {
  const rawDigits = value.replace(/\D/g, '')
  if (!rawDigits) return ''

  if (rawDigits.startsWith('375')) {
    return appendGroups('+375', rawDigits.slice(3, 12), 2)
  }

  if (
    rawDigits.startsWith('7') ||
    rawDigits.startsWith('8') ||
    rawDigits.startsWith('9')
  ) {
    const russianDigits = rawDigits.startsWith('9')
      ? `7${rawDigits}`
      : `7${rawDigits.slice(1)}`
    return appendGroups('+7', russianDigits.slice(1, 11), 3)
  }

  return `+${rawDigits.slice(0, 15)}`
}

export const formatPhone = (phone: string): string => formatPhoneInput(phone)
