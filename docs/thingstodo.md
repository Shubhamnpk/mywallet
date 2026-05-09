🔴 Critical Issues Found
1. Event Listener Memory Leak (Bug) (fixed)
File: portfolio-list.tsx:202-228

The custom event listener for openStockTransaction has an empty dependency array [], but it uses setNewTx and setIsAddDialogOpen which are stable setState functions. While this works, there's a potential issue if the component unmounts and remounts - the event listener could accumulate.

Solution: Add proper cleanup or use a ref-based approach.

2. Performance Issue: Massive useWalletData Destructure (Performance)
File: portfolio-list.tsx:95

tsx
const {portfolio,shareTransactions,deletePortfolioItem,fetchPortfolioPrices,addShareTransaction,deleteShareTransaction,deleteMultipleShareTransactions,recomputePortfolio,importShareData,userProfile,portfolios,activePortfolioId,addPortfolio,switchPortfolio,deletePortfolio,updatePortfolio,clearPortfolioHistory,updateUserProfile,getFaceValue,upcomingIPOs,isIPOsLoading,topStocks,marketStatus,marketSummary,marketSummaryHistory,noticesBundle,disclosures,exchangeMessages,scripNamesMap,toggleZeroHolding,} = useWalletData()
Problem: Destructuring 30+ values from context on every render causes unnecessary re-renders when any context value changes.

3. Duplicate onClick Handlers Missing preventDefault (UI/UX Bug)
File: portfolio-list.tsx:1380-1427

Multiple buttons inside a clickable card don't consistently use e.stopPropagation() and e.preventDefault(), causing unintended navigation when clicking action buttons.

4. Inconsistent Mobile/Desktop Layout (UI/UX)
File: portfolio-list.tsx:1341-1360

The diversification section uses md:hidden for mobile layout but lacks proper spacing and alignment on smaller screens. The badge sizing and text scaling is inconsistent.

5. Missing Error Boundary for PDF Viewer (Bug)
File: stock-detail-modal.tsx:30-31

The PDF viewer from @react-pdf-viewer/core is imported but no error handling is implemented for PDF loading failures. If the CDN fails, the entire modal crashes.

6. Hardcoded CDN URL (Maintainability)
File: stock-detail-modal.tsx:57

tsx
const PDF_WORKER_URL = "https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs"
External CDN dependency without fallback. If unpkg is down or blocked, PDF viewing fails.

7. Accessibility Issues (A11y)
File: add-transaction-modal.tsx:132

tsx
onKeyDown={(e) => e.key === 'Enter' && onAdd()}
No keyboard navigation support for suggestion dropdown
Missing ARIA labels on suggestion buttons
No focus trap within the modal
8. Race Condition in Crypto Loading (Bug)
File: add-transaction-modal.tsx:61-78

tsx
useEffect(() => {
    if (!open || newTx.assetType !== "crypto") return
    let mounted = true
    const loadCoins = async () => {
        setIsLoadingCoins(true)
        try {
            const res = await fetch("/api/crypto/coinlore/popular")
            // ... no error handling for non-ok responses beyond data check
        } finally {
            if (mounted) setIsLoadingCoins(false)
        }
    }
    void loadCoins()
    return () => { mounted = false }
}, [open, newTx.assetType])
Missing error toast/feedback when the API fails. Users see "Loading coins..." indefinitely on failure.

9. setTimeout in onBlur (UX Bug)
File: add-transaction-modal.tsx:185

tsx
onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
Arbitrary 120ms timeout causes suggestions to flicker or disappear before click registers, especially on slower devices.

10. Magic Numbers Everywhere (Maintainability)
Multiple files contain hardcoded values like:

slice(0, 8) for suggestions
3 * 60 * 1000 for cache duration
120ms timeout
No centralized configuration.

11. Inconsistent Responsive Classes (UI/UX)
File: portfolio-list.tsx:1248-1320

Mix of sm:, md:, and default breakpoints without consistent design tokens:

text-[9px] sm:text-[10px]
px-2 sm:px-3 py-0.5 sm:py-1
h-10 w-10 vs h-9 w-9 sm:h-10 sm:w-auto
12. Missing Loading States (UX)
File: portfolio-list.tsx

The portfolio list doesn't show skeleton loaders while initial data loads - it shows empty state or jumps content.

13. Confirm Dialogs Without Proper Styling (UI/UX)
File: portfolio-list.tsx:1424-1427

Using native confirm() instead of custom styled modal breaks design consistency:

tsx
onClick={(e) => {
    e.stopPropagation();
    if (confirm(`Delete portfolio "${p.name}"? This action cannot be undone.`)) deletePortfolio(p.id);
}}
14. Unused Imports (Code Quality)
File: stock-detail-modal.tsx

Several imports may be unused or only partially used, increasing bundle size unnecessarily.

🟡 Medium Priority Issues
15. Custom Event Type Safety (TypeScript)
The custom event openStockTransaction uses CustomEvent without proper type definitions, making it prone to runtime errors.

16. No Debouncing on Search (Performance)
The search in add-transaction-modal.tsx filters on every keystroke without debouncing, causing UI jank with large lists.

17. Chart Re-renders (Performance)
Recharts components in portfolio-list.tsx re-render on every state change due to inline array creation in props.

18. Z-Index Conflicts (UI)
Multiple components use z-50 for suggestions/dropdowns without a centralized z-index system, causing potential stacking issues.

