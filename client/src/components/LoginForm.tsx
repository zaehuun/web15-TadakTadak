import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaGithub } from 'react-icons/fa';
import { postLogin } from '@src/apis';
import { FORM, INPUT } from '@utils/constant';
import InfoMessage from './InfoMessage';
import Form from './common/Form';
import useInput from '@hooks/useInput';
import { useUserFns } from '@contexts/userContext';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: ${FORM.LOGIN_WIDTH}rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: absolute;
  top: 20%;
`;

const Input = styled.input`
  font-size: ${({ theme }) => theme.fontSizes.lg};
`;

const Button = styled.button`
  ${({ theme }) => theme.flexCenter}
  background-color: ${({ theme }) => theme.colors.green};
  padding: ${({ theme }) => theme.paddings.sm};
  color: ${({ theme }) => theme.colors.white};
  border-radius: 1rem;
`;

const GithubLoginButton = styled.button`
  ${({ theme }) => theme.flexCenter}
  background-color: ${({ theme }) => theme.colors.black};
  color: ${({ theme }) => theme.colors.white};
  padding: ${({ theme }) => theme.paddings.sm};
  border-radius: 1rem;
  & :first-child {
    margin-right: ${({ theme }) => theme.margins.base};
  }
`;

const ModalToggleSpan = styled.span`
  width: 100%;
  margin-top: ${({ theme }) => theme.margins.lg};
  color: ${({ theme }) => theme.colors.blue};
  text-align: center;
  cursor: pointer;
  :hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

interface LoginProps {
  onClickModalToggle: React.MouseEventHandler<HTMLButtonElement>;
  setModal: React.Dispatch<React.SetStateAction<boolean>>;
}

const LoginForm = ({ onClickModalToggle, setModal }: LoginProps): JSX.Element => {
  const [email, onChangeEmail] = useInput('');
  const [password, onChangePassword] = useInput('');
  const { logUserIn } = useUserFns();
  const [message, setMessage] = useState('');

  const showMessage = (msg: string) => setMessage(msg);
  const onClickGithubLogin = () => {
    // Github Login request
  };

  const onSubmitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) {
      showMessage('모두 입력해주세요');
      return;
    }
    const requestBody = { email, password };
    const { isOk, data } = await postLogin(requestBody);
    if (isOk && data) {
      logUserIn(data);
      setModal(false);
      return;
    }
    showMessage('이메일 및 비밀번호를 확인해주세요');
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), FORM.DELAY * 1000);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [message]);

  return (
    <Container>
      <Form onSubmit={onSubmitForm} width={FORM.LOGIN_WIDTH} height={FORM.LOGIN_HEIGHT}>
        <Input
          type="text"
          placeholder="Email"
          id="email"
          value={email}
          onChange={onChangeEmail}
          maxLength={INPUT.EMAIL_MAX_LENGTH}
        />
        <Input
          type="password"
          placeholder="Password"
          id="password"
          value={password}
          minLength={INPUT.PASSWORD_MIN_LENGTH}
          maxLength={INPUT.PASSWORD_MAX_LENGTH}
          onChange={onChangePassword}
        />
        <Button>로그인</Button>
        <GithubLoginButton onClick={onClickGithubLogin}>
          <FaGithub fill="#fff" />
          Github 로그인
        </GithubLoginButton>
        {message && <InfoMessage message={message} />}
      </Form>
      <ModalToggleSpan onClick={onClickModalToggle}>회원가입 하러 가기</ModalToggleSpan>
    </Container>
  );
};

export default LoginForm;
