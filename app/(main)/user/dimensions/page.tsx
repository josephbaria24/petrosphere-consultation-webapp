'use client'

import { DimensionsManager } from '../../../../components/dimensions/DimensionsManager'
import { GatedFeature } from '../../../../components/gated-feature'
import { useApp } from '../../../../components/app/AppProvider'
import { Cookies } from '../../../../lib/cookies-client'

export default function ManageDimensionsPage() {
  const { limits } = useApp()
  const isAdmin = !!Cookies.get('admin_id')
  const isRestricted = !isAdmin && !limits?.allow_dimensions

  return (
    <GatedFeature
      isRestricted={isRestricted}
      featureName="Dimensions Management"
      description="Organize reusable safety culture dimension sets for your surveys."
    >
      <DimensionsManager scopeToOrg />
    </GatedFeature>
  )
}
