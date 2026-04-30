export const ROLES = {
  USER: "user",
  SELLER: "seller",
  ADMIN: "admin",
};

export function hasRole(user, allowedRoles) {
  if (!user) {
    return false;
  }

  return allowedRoles.includes(user.role);
}

export function getRoleLabel(role) {
  switch (role) {
    case ROLES.ADMIN:
      return "Администратор";
    case ROLES.SELLER:
      return "Продавец";
    case ROLES.USER:
    default:
      return "Пользователь";
  }
}
