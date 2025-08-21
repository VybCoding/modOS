
export type User = {
  id: string;
  username: string;
  avatar: string;
  joinDate: Date;
  status: 'pending' | 'verified' | 'banned';
  warnings?: number;
};

export type Log = {
  id: string;
  type:
    | 'join'
    | 'verified'
    | 'failed'
    | 'kicked'
    | 'banned'
    | 'admin_verify'
    | 'warn'
    | 'blacklist-delete';
  message: string;
  timestamp: Date;
};

export type StatCard = {
  title: string;
  value: string;
  change?: string;
  icon: React.ElementType;
};

export type ChartData = {
  date: string;
  verified: number;
  kicked: number;
};
