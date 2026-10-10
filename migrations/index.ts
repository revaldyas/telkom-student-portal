import * as migration_20261010_003800_add_vercel_blob_object_key from './20261010_003800_add_vercel_blob_object_key';

export const migrations = [
  {
    up: migration_20261010_003800_add_vercel_blob_object_key.up,
    down: migration_20261010_003800_add_vercel_blob_object_key.down,
    name: '20261010_003800_add_vercel_blob_object_key'
  },
];
