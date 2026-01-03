import { UserStatus } from '@/user/domain/enum/user-status.enum';
import { ContactInfo } from '@/user/domain/type/contact-info';

export type CreateUserInput = {
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  position?: string | null;
  contactInfo?: ContactInfo | null;
  shortDescription?: string | null;
  status?: UserStatus;
};
