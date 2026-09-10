import { useState } from "react";
import {
  Button,
  Flex,
  Form,
  Heading,
  TextField,
  View,
  Text,
  ToggleButton,
} from "@adobe/react-spectrum";
import { auth, isMockAuth } from "../lib/firebase";

export default function AuthScreen() {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const action =
      mode === "signup"
        ? auth.createUserWithEmailAndPassword(email, password)
        : auth.signInWithEmailAndPassword(email, password);

    action
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Authentication failed.");
      })
      .finally(() => setBusy(false));
  }

  return (
    <div className="auth-screen screen-enter">
      <div className="auth-card-wrap">
        <div className="auth-card-glow" aria-hidden="true" />
        <View borderRadius="large" padding="size-400" UNSAFE_className="auth-card">
          <div className="auth-wordmark">
            <span className="brand-mark" aria-hidden="true">
              🧠
            </span>
            <div>
              <Heading level={2} margin={0}>
                Model Search
              </Heading>
              <Text UNSAFE_style={{ fontSize: 13, opacity: 0.8 }}>
                Browse and filter the HuggingFace model catalog.
              </Text>
            </div>
          </div>

          {isMockAuth && (
            <View marginTop="size-200">
              <span className="mock-badge">● Mock auth mode — any email/password works</span>
            </View>
          )}

          <Form marginTop="size-300" onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              isRequired
              autoFocus
              width="100%"
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              isRequired
              minLength={6}
              width="100%"
            />
            <Flex marginTop="size-250" gap="size-150" alignItems="center" wrap>
              <View UNSAFE_className="auth-submit-btn" borderRadius="regular" overflow="hidden">
                <Button type="submit" variant="accent" isPending={busy}>
                  {mode === "signup" ? "Sign up" : "Sign in"}
                </Button>
              </View>
              <ToggleButton
                isSelected={false}
                isQuiet
                onPress={() => setMode(mode === "signup" ? "signin" : "signup")}
              >
                {mode === "signup" ? "Have an account? Sign in" : "Need an account? Sign up"}
              </ToggleButton>
            </Flex>
          </Form>
          {error && <span className="auth-error">{error}</span>}
        </View>
      </div>
    </div>
  );
}
