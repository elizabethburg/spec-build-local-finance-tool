const CATEGORY_COLORS: Record<string, string> = {
  'Income':             '#7EB345', // green
  'Groceries':          '#7EB345', // green
  'Health & Medical':   '#66B5AD', // teal
  'Transportation':     '#66B5AD', // teal
  'Utilities & Bills':  '#66B5AD', // teal
  'Travel & Hotels':    '#66B5AD', // teal
  'Dining & Bars':      '#C8544B', // red
  'Coffee & Cafes':     '#E1823B', // orange
  'General Household':  '#E1823B', // orange
  'Gas & Fuel':         '#EAB92D', // yellow
  'Shopping & Retail':  '#A682B5', // purple
  'Entertainment':      '#A682B5', // purple
  'Subscriptions':      '#A682B5', // purple
  'Transfer':           '#706B67', // muted brown-gray
  'Other':              '#b8b0a8', // warm gray
}

export function categoryColor(name: string): string {
  return CATEGORY_COLORS[name] ?? '#9ca3af'
}
