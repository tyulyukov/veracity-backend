import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserStatus } from '../enum/user-status.enum';
import { ContactInfo } from '../type/contact-info';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 100, name: 'first_name' })
  firstName: string;

  @Column({ type: 'varchar', length: 100, name: 'last_name' })
  lastName: string;

  @Column({ type: 'text', nullable: true, name: 'avatar_url' })
  avatarUrl: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  position: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'contact_info' })
  contactInfo: ContactInfo | null;

  @Column({ type: 'text', nullable: true, name: 'short_description' })
  shortDescription: string | null;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_activity_at' })
  lastActivityAt: Date | null;
}

