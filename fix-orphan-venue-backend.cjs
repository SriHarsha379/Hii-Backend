const fs = require('fs');

let vc = fs.readFileSync('src/controller/admin/vendorController.js', 'utf8');

vc = vc.replace(
  `    await Vendor.findOneAndUpdate(
      { _id: id, is_deleted: { $ne: true } },
      { is_deleted: true, is_active: false, deleted_at: new Date() },
      { new: true, runValidators: false }
    );`,
  `    await Vendor.findOneAndUpdate(
      { _id: id, is_deleted: { $ne: true } },
      { is_deleted: true, is_active: false, deleted_at: new Date() },
      { new: true, runValidators: false }
    );

    // Soft-delete linked venue so createVenue doesn't block on orphan check
    try {
      await Venue.findOneAndUpdate(
        { vendor_id: id, is_deleted: false },
        { is_deleted: true },
        { runValidators: false }
      );
    } catch (ve) {
      console.warn('[deleteVendor] venue soft-delete failed:', ve.message);
    }`
);

fs.writeFileSync('src/controller/admin/vendorController.js', vc, 'utf8');
console.log('✅ vendorController.js done');
