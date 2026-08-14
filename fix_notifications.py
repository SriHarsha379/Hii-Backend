import re

path = "src/controller/app/userController.js"

with open(path, "r") as f:
    content = f.read()

hook = "helper.checkAndNotifyProfileCompletion(userId).catch(() => {});"

replacements = [
    # 1. editProfile
    (
        "    await user.save();\n    /* ================= TOKEN ================= */",
        f"    await user.save();\n    {hook}\n    /* ================= TOKEN ================= */"
    ),
    # 2. updateUserInterests
    (
        "    ];\n\n    await user.save();\n\n    const token = generateToken.generateToken(userId);\n    const userData = await helper.getUserData(userId);\n    userData.token = token;\n\n    return apiResponse.ok(res, userData, messages.DATA_ADDED);",
        f"    ];\n\n    await user.save();\n    {hook}\n\n    const token = generateToken.generateToken(userId);\n    const userData = await helper.getUserData(userId);\n    userData.token = token;\n\n    return apiResponse.ok(res, userData, messages.DATA_ADDED);"
    ),
    # 3. uploadUserGallery
    (
        "    user.user_gallery.push(...galleryItems);\n    await user.save();",
        f"    user.user_gallery.push(...galleryItems);\n    await user.save();\n    {hook}"
    ),
    # 4. updateUserHobbies
    (
        '    if (!updatedUser) {\n      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);\n    }\n\n    const token = generateToken.generateToken(userId);\n    const userData = await helper.getUserData(userId);\n    userData.token = token;\n\n    return apiResponse.ok(\n      res,\n      userData,\n      messages.HOBBIES_UPDATE_SUCCESS\n    );',
        f'    if (!updatedUser) {{\n      return apiResponse.badRequest(res, messages.USER_NOT_FOUND);\n    }}\n\n    {hook}\n\n    const token = generateToken.generateToken(userId);\n    const userData = await helper.getUserData(userId);\n    userData.token = token;\n\n    return apiResponse.ok(\n      res,\n      userData,\n      messages.HOBBIES_UPDATE_SUCCESS\n    );'
    ),
]

for old, new in replacements:
    if old not in content:
        print(f"⚠️  WARNING: pattern not found (skipped):\n{old[:80]}...\n")
        continue
    if content.count(old) > 1:
        print(f"⚠️  WARNING: pattern appears more than once (skipped, needs manual edit):\n{old[:80]}...\n")
        continue
    content = content.replace(old, new)
    print(f"✅ Applied edit: {old[:60].strip()}...")

with open(path, "w") as f:
    f.write(content)

print("\nDone. Now check updateSocialAccount manually — see below.")
