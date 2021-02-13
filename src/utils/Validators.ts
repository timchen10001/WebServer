import { FieldError, UsernameEmailPassword } from "../resolvers/graphql.types";

export function inValidUsername(
  username: string,
  field: string
): FieldError[] | undefined {
  if (username.length < 3) {
    return [
      {
        field,
        message: "使用者名稱長度不得低於 3 個字元",
      },
    ];
  }
  // 增加其餘條件寫在此
  // ...

  return;
}

export function inValidEmail(
  email: string,
  field: string
): FieldError[] | undefined {
  if (!email.includes("@")) {
    return [
      {
        field,
        message: "電子信箱格式錯誤",
      },
    ];
  }
  // 增加其餘條件寫在此
  // ...
  return 
}

export function inValidPassword(
  password: string,
  field: string
): FieldError[] | undefined {
  if (password.length < 6) {
    return [
      {
        field,
        message: "密碼長度不得低於 6 個字元",
      },
    ];
  }
  // ...
  return 
}



export function inValidUsernameOrEmail(
  usernameOrEmail: string,
): FieldError[] | undefined {
  
  let errors: FieldError[] | undefined;

  if (usernameOrEmail.includes('@')) {
    errors = inValidEmail(usernameOrEmail, 'usernameOrEmail')
  } else {
    errors = inValidUsername(usernameOrEmail, 'usernameOrEmail');
  }

  return errors;
}

export function inValidUsernameEmailPassword(
  input: UsernameEmailPassword
): FieldError[] | undefined {

  let errors: FieldError[] | undefined;

  switch (true) {
    case !!(errors = inValidUsername(input.username, 'username')):
      break;
    case !!(errors = inValidEmail(input.email, 'email')):
      break;
    case !!(errors = inValidPassword(input.password, 'password')):
      break;
  }
  return errors;
}
