export type HSNInfo = {
  code: string;
  description: string;
  gstPercent: number;
  category?: string;
};

const HSN_MAP: Record<string, HSNInfo> = {
  '9401': {
    code: '9401',
    description: 'Seats (other than those of heading 9402), whether or not convertible into beds, and parts thereof',
    gstPercent: 18,
    category: 'Seating',
  },
  '9403': {
    code: '9403',
    description: 'Other furniture and parts thereof',
    gstPercent: 18,
    category: 'Furniture',
  },
  '9954': {
    code: '9954',
    description: 'Construction services; installation services',
    gstPercent: 18,
    category: 'Services',
  },
};

export function getHSNInfo(hsnCode: string): HSNInfo | undefined {
  const key = (hsnCode || '').trim();
  return key && HSN_MAP[key] ? HSN_MAP[key] : undefined;
}
