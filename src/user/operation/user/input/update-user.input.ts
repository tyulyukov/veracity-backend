import { UserStatus } from '../../../domain/enum/user-status.enum';
import { ContactInfo } from '../../../domain/type/contact-info';

export type UpdateUserInput = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  position?: string | null;
  contactInfo?: ContactInfo | null;
  shortDescription?: string | null;
  status?: UserStatus;
  lastActivityAt?: Date | null;
};
