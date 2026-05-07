export const colors = {
  indigo:       '#4F3FF0',
  indigoMid:    '#7B6FF5',
  indigoPale:   '#EAE8FD',

  deepNight:    '#1A1535',
  softCanvas:   '#F8F7FF',
  pure:         '#FFFFFF',

  emergeGreen:  '#2ECC8F',
  coral:        '#F06B6B',
  amber:        '#F5A623',
  slate:        '#94A3B8',

  violet:       '#9B6DFF',

  textPrimary:   '#1A1535',
  textSecondary: '#4B5563',
  textMuted:     '#94A3B8',
  textInverse:   '#FFFFFF',

  categories: {
    groceries:        '#2ECC8F',
    diningBars:       '#F06B6B',
    coffeeCafes:      '#C8813A',
    transportation:   '#4F3FF0',
    shoppingRetail:   '#9B6DFF',
    entertainment:    '#F5A623',
    healthMedical:    '#26C0C7',
    subscriptions:    '#6B8CFF',
    utilitiesBills:   '#64748B',
    income:           '#2ECC8F',
    transfer:         '#94A3B8',
    other:            '#CBD5E1',
    generalHousehold: '#A78BFA',
    gasFuel:          '#FB923C',
    travelHotels:     '#34D399',
  }
}

export const typography = {
  fonts: {
    display: "'Plus Jakarta Sans', sans-serif",
    body:    "'Inter', sans-serif",
  },
  scale: {
    heroNumber:    { size: '72px', weight: 600, font: 'display' },
    screenTitle:   { size: '28px', weight: 600, font: 'display' },
    sectionHeader: { size: '13px', weight: 600, font: 'body', transform: 'uppercase', letterSpacing: '0.08em' },
    body:          { size: '15px', weight: 400, font: 'body' },
    label:         { size: '12px', weight: 400, font: 'body' },
    dataNumber:    { size: '15px', weight: 500, font: 'body', fontVariant: 'tabular-nums' },
    button:        { size: '15px', weight: 500, font: 'body' },
  }
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Groceries':         colors.categories.groceries,
  'Dining & Bars':     colors.categories.diningBars,
  'Coffee & Cafes':    colors.categories.coffeeCafes,
  'Transportation':    colors.categories.transportation,
  'Shopping & Retail': colors.categories.shoppingRetail,
  'Entertainment':     colors.categories.entertainment,
  'Health & Medical':  colors.categories.healthMedical,
  'Subscriptions':     colors.categories.subscriptions,
  'Utilities & Bills': colors.categories.utilitiesBills,
  'Income':            colors.categories.income,
  'Transfer':          colors.categories.transfer,
  'Other':             colors.categories.other,
  'General Household': colors.categories.generalHousehold,
  'Gas & Fuel':        colors.categories.gasFuel,
  'Travel & Hotels':   colors.categories.travelHotels,
}
