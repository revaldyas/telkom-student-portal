import * as migration_20261010_003800_add_vercel_blob_object_key from './20261010_003800_add_vercel_blob_object_key';
import * as migration_20261011_075200_ensure_vercel_blob_object_key from './20261011_075200_ensure_vercel_blob_object_key';
import * as migration_20261011_085218 from './20261011_085218';
import * as migration_20261011_120000_portfolio_review_history from './20261011_120000_portfolio_review_history';
import * as migration_20261011_130000_portfolio_details from './20261011_130000_portfolio_details';
import * as migration_20261011_140000_portfolio_gallery from './20261011_140000_portfolio_gallery';
import * as migration_20261011_150000_projects from './20261011_150000_projects';
import * as migration_20261011_160000_fix_project_members_columns from './20261011_160000_fix_project_members_columns';
import * as migration_20261011_170000_project_mentors_and_reviews from './20261011_170000_project_mentors_and_reviews';
import * as migration_20261011_200000_home_banners from './20261011_200000_home_banners';
import * as migration_20261011_210000_home_banner_project_locks from './20261011_210000_home_banner_project_locks';
import * as migration_20261011_220000_portfolio_category_codes from './20261011_220000_portfolio_category_codes';
import * as migration_20261011_230000_project_array_ids from './20261011_230000_project_array_ids';
import * as migration_20261011_240000_home_banner_optional_image from './20261011_240000_home_banner_optional_image';
import * as migration_20261017_100000_draft_support from './20261017_100000_draft_support';
import * as migration_20261017_100100_existing_drafts_submitted from './20261017_100100_existing_drafts_submitted';
import * as migration_20261017_100200_testimonials from './20261017_100200_testimonials';
import * as migration_20261017_110000_profile_appearance from './20261017_110000_profile_appearance';
import * as migration_20261017_110100_testimonials_lock_rels from './20261017_110100_testimonials_lock_rels';
import * as migration_20261018_100000_pinned_works from './20261018_100000_pinned_works';
import * as migration_20261018_110000_chat from './20261018_110000_chat';
import * as migration_20261018_120000_chat_photo from './20261018_120000_chat_photo';
import * as migration_20261018_130000_project_tracker from './20261018_130000_project_tracker';
import * as migration_20261018_140000_project_social from './20261018_140000_project_social';

export const migrations = [
  {
    up: migration_20261010_003800_add_vercel_blob_object_key.up,
    down: migration_20261010_003800_add_vercel_blob_object_key.down,
    name: '20261010_003800_add_vercel_blob_object_key',
  },
  {
    up: migration_20261011_075200_ensure_vercel_blob_object_key.up,
    down: migration_20261011_075200_ensure_vercel_blob_object_key.down,
    name: '20261011_075200_ensure_vercel_blob_object_key',
  },
  {
    up: migration_20261011_085218.up,
    down: migration_20261011_085218.down,
    name: '20261011_085218'
  },
  {
    up: migration_20261011_120000_portfolio_review_history.up,
    down: migration_20261011_120000_portfolio_review_history.down,
    name: '20261011_120000_portfolio_review_history',
  },
  {
    up: migration_20261011_130000_portfolio_details.up,
    down: migration_20261011_130000_portfolio_details.down,
    name: '20261011_130000_portfolio_details',
  },
  {
    up: migration_20261011_140000_portfolio_gallery.up,
    down: migration_20261011_140000_portfolio_gallery.down,
    name: '20261011_140000_portfolio_gallery',
  },
  {
    up: migration_20261011_150000_projects.up,
    down: migration_20261011_150000_projects.down,
    name: '20261011_150000_projects',
  },
  {
    up: migration_20261011_160000_fix_project_members_columns.up,
    down: migration_20261011_160000_fix_project_members_columns.down,
    name: '20261011_160000_fix_project_members_columns',
  },
  {
    up: migration_20261011_170000_project_mentors_and_reviews.up,
    down: migration_20261011_170000_project_mentors_and_reviews.down,
    name: '20261011_170000_project_mentors_and_reviews',
  },
  {
    up: migration_20261011_200000_home_banners.up,
    down: migration_20261011_200000_home_banners.down,
    name: '20261011_200000_home_banners',
  },
  {
    up: migration_20261011_210000_home_banner_project_locks.up,
    down: migration_20261011_210000_home_banner_project_locks.down,
    name: '20261011_210000_home_banner_project_locks',
  },
  {
    up: migration_20261011_220000_portfolio_category_codes.up,
    down: migration_20261011_220000_portfolio_category_codes.down,
    name: '20261011_220000_portfolio_category_codes',
  },
  {
    up: migration_20261011_230000_project_array_ids.up,
    down: migration_20261011_230000_project_array_ids.down,
    name: '20261011_230000_project_array_ids',
  },
  {
    up: migration_20261011_240000_home_banner_optional_image.up,
    down: migration_20261011_240000_home_banner_optional_image.down,
    name: '20261011_240000_home_banner_optional_image',
  },
  {
    up: migration_20261017_100000_draft_support.up,
    down: migration_20261017_100000_draft_support.down,
    name: '20261017_100000_draft_support',
  },
  {
    up: migration_20261017_100100_existing_drafts_submitted.up,
    down: migration_20261017_100100_existing_drafts_submitted.down,
    name: '20261017_100100_existing_drafts_submitted',
  },
  {
    up: migration_20261017_100200_testimonials.up,
    down: migration_20261017_100200_testimonials.down,
    name: '20261017_100200_testimonials',
  },
  {
    up: migration_20261017_110000_profile_appearance.up,
    down: migration_20261017_110000_profile_appearance.down,
    name: '20261017_110000_profile_appearance',
  },
  {
    up: migration_20261017_110100_testimonials_lock_rels.up,
    down: migration_20261017_110100_testimonials_lock_rels.down,
    name: '20261017_110100_testimonials_lock_rels',
  },
  {
    up: migration_20261018_100000_pinned_works.up,
    down: migration_20261018_100000_pinned_works.down,
    name: '20261018_100000_pinned_works',
  },
  {
    up: migration_20261018_110000_chat.up,
    down: migration_20261018_110000_chat.down,
    name: '20261018_110000_chat',
  },
  {
    up: migration_20261018_120000_chat_photo.up,
    down: migration_20261018_120000_chat_photo.down,
    name: '20261018_120000_chat_photo',
  },
  {
    up: migration_20261018_130000_project_tracker.up,
    down: migration_20261018_130000_project_tracker.down,
    name: '20261018_130000_project_tracker',
  },
  {
    up: migration_20261018_140000_project_social.up,
    down: migration_20261018_140000_project_social.down,
    name: '20261018_140000_project_social',
  },
];
