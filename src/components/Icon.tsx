import { Github, Globe, Linkedin, Mail, type LucideProps } from "lucide-react";

const iconMap = {
  github: Github,
  globe: Globe,
  linkedin: Linkedin,
  mail: Mail,
} as const;

export type IconName = keyof typeof iconMap;

interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
}

const Icon = ({ name, ...props }: IconProps) => {
  const LucideIcon = iconMap[name];
  return <LucideIcon {...props} />;
};

export default Icon;
