import type { AsyncResult } from '@/hooks/useAsync'
import useAsync from '@/hooks/useAsync'
import useSafeAddress from '@/hooks/useSafeAddress'
import minBy from 'lodash/minBy'
import { FEATURES, hasFeature } from '@/utils/chains'
import { useCurrentChain } from '@/hooks/useChains'
import { getRelays } from '@/services/tx/relaying'
import type { RelayResponse } from '@/services/tx/relaying'
import { logError, Errors } from '@/services/exceptions'
import { useRelayingDebugger } from './useRelayingDebugger'

// TODO: Import from service (or load via eventual config)
export const MAX_HOUR_RELAYS = 5

export const useRelaysBySafe = (): AsyncResult<RelayResponse> => {
  const chain = useCurrentChain()
  const safeAddress = useSafeAddress()
  const [isRelayingEnabled] = useRelayingDebugger()

  return useAsync<RelayResponse>(() => {
    if (!safeAddress || !chain || !hasFeature(chain, FEATURES.RELAYING) || !isRelayingEnabled) return

    return getRelays(chain.chainId, safeAddress)
  }, [chain, safeAddress, isRelayingEnabled])
}

export const useLeastRemainingRelays = (ownerAddresses: string[]): AsyncResult<RelayResponse> => {
  const chain = useCurrentChain()
  const [isRelayingEnabled] = useRelayingDebugger()

  return useAsync(async () => {
    if (!chain || !hasFeature(chain, FEATURES.RELAYING) || !isRelayingEnabled) return

    let relays: RelayResponse[] | undefined

    try {
      relays = await Promise.all(ownerAddresses.map((address) => getRelays(chain.chainId, address)))
    } catch (error) {
      logError(Errors._630, (error as Error).message)
    }

    const minimum = minBy(relays, 'remaining')

    return minimum || { remaining: 0, limit: MAX_HOUR_RELAYS }
  }, [chain, ownerAddresses, isRelayingEnabled])
}