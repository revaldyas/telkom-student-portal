import * as migration_20261010_003800_add_vercel_blob_object_key from './20261010_003800_add_vercel_blob_object_key';
import * as migration_20261011_075200_ensure_vercel_blob_object_key from './20261011_075200_ensure_vercel_blob_object_key';
import * as migration_20261011_085218 from './20261011_085218';

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
];
