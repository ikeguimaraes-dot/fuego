export type MenuOption = {
  id: string;
  poll_id: string;
  title: string;
  description: string;
  dishes: string[];
  tag: string;
  position: number;
};
export type Poll = {
  id: string;
  title: string;
  week_start: string;
  closes_at: string;
  status: "draft" | "open" | "closed";
  fuego_options: MenuOption[];
};
