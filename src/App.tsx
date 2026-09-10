import { Provider, defaultTheme, Flex, Heading, Button, Text, View, ProgressCircle } from "@adobe/react-spectrum";
import { useAuth } from "./hooks/useAuth";
import { useModelSearch } from "./hooks/useModelSearch";
import AuthScreen from "./components/AuthScreen";
import ConnectionBanner from "./components/ConnectionBanner";
import ModelFilters from "./components/ModelFilters";
import ModelList from "./components/ModelList";
import "./App.css";

function MainApp() {
  const { auth } = useAuth();
  const {
    loading,
    error,
    usingCache,
    searchInput,
    handleSearchInput,
    setPipelineTag,
    setFamily,
    setArchitectureTag,
    setPrecisionTag,
    setSafetensorRange,
    setSort,
    resetFilters,
    queryState,
    facets,
    models,
    totalCount,
  } = useModelSearch();

  return (
    <div className="main-app fade-in">
      <Flex direction="column" gap="size-200" UNSAFE_className="app-shell">
        <Flex justifyContent="space-between" alignItems="center" wrap>
          <Heading level={1}>Model Search</Heading>
          <Flex gap="size-200" alignItems="center">
            <ConnectionBanner />
            <Button variant="secondary" onPress={() => auth.signOut()}>
              Sign out
            </Button>
          </Flex>
        </Flex>

        {usingCache && (
          <View backgroundColor="gray-75" padding="size-100" borderRadius="medium">
            <Text>Showing cached data (offline or last fetch failed).</Text>
          </View>
        )}
        {error && !usingCache && (
          <View backgroundColor="gray-75" padding="size-100" borderRadius="medium">
            <Text>{error}</Text>
          </View>
        )}

        <ModelFilters
          searchInput={searchInput}
          onSearchChange={handleSearchInput}
          facets={facets}
          pipelineTag={queryState.pipelineTag}
          family={queryState.family}
          architectureTag={queryState.architectureTag}
          precisionTag={queryState.precisionTag}
          safetensorMin={queryState.safetensorMin}
          safetensorMax={queryState.safetensorMax}
          sort={queryState.sort}
          onPipelineTag={setPipelineTag}
          onFamily={setFamily}
          onArchitectureTag={setArchitectureTag}
          onPrecisionTag={setPrecisionTag}
          onSafetensorRange={setSafetensorRange}
          onSort={setSort}
          onReset={resetFilters}
        />

        <Text>
          Showing {models.length} of {totalCount} models
        </Text>

        {loading ? (
          <Flex justifyContent="center" marginTop="size-400">
            <ProgressCircle isIndeterminate aria-label="Loading models" />
          </Flex>
        ) : (
          <ModelList models={models} />
        )}
      </Flex>
    </div>
  );
}

export default function App() {
  const { user, initializing } = useAuth();

  return (
    <Provider theme={defaultTheme} colorScheme="light">
      {initializing ? (
        <Flex justifyContent="center" alignItems="center" height="100vh">
          <ProgressCircle isIndeterminate aria-label="Loading" />
        </Flex>
      ) : user ? (
        <MainApp key="main" />
      ) : (
        <AuthScreen key="auth" />
      )}
    </Provider>
  );
}
