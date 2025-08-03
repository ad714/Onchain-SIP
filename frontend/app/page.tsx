"use client";

import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId } from "wagmi";
import { useSIPContract, formatSIPData, generatePoolName, getTotalPortfolioValue, getTotalExecutedAmount } from "../hooks/useSIPContract";
import styles from "./page.module.css";

// Define proper TypeScript interfaces
interface FrequencyOption {
  label: string;
  sipAmount: number;
  intervals: number;
  frequencySeconds: number;
}

interface SelectedFreq {
  label: string;
  sipAmount: number;
  intervals: number;
  frequencySeconds: number;
}

export default function Home() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  
  const [isHydrated, setIsHydrated] = useState(false);
  const [showSIPForm, setShowSIPForm] = useState(false);
  const [currentPool, setCurrentPool] = useState("default");
  const [txStatus, setTxStatus] = useState("");
  const [selectedSIPPool, setSelectedSIPPool] = useState<string>("");

  // SIP form states with proper types
  const [totalInvestment, setTotalInvestment] = useState(0.2);
  const [maturity, setMaturity] = useState("6");
  const [frequencies, setFrequencies] = useState<FrequencyOption[]>([]);
  const [selectedFreq, setSelectedFreq] = useState<SelectedFreq | null>(null);
  const [errors, setErrors] = useState("");

  const isBNBTestnet = chainId === 97;
  
  const { useCreateNativeSIP, useGetAllUserSIPs, useExecuteSIP, useFinalizeSIP } = useSIPContract();

  // Get user's all SIP plans (updated to use the new hook)
  const { allSIPs, isLoading: sipsLoading, error: sipsError, refetch: refetchAllSIPs, hasActiveSIPs } = useGetAllUserSIPs(address);
  
const maturityOptions = [
  { value: "6", label: "6 months" },
  { value: "12", label: "1 year" },
  { value: "24", label: "2 years" },
  { value: "36", label: "3 years" },
  { value: "48", label: "4 years" },
  { value: "60", label: "5 years" },
];

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Generate unique pool name for new SIPs
  useEffect(() => {
    if (address && !hasActiveSIPs) {
      setCurrentPool(generatePoolName(address, Date.now()));
    }
  }, [address, hasActiveSIPs]);

  const validateInputs = () => {
    if (totalInvestment < 0.2) return "Minimum investment is 0.2 tBNB";
    if (!selectedFreq) return "Please select a frequency";
    if (isHydrated && !isBNBTestnet && isConnected) return "Please switch to BNB Testnet";
    return "";
  };

  const calculateFrequencies = () => {
  const months = parseInt(maturity);
  const total = parseFloat(totalInvestment.toString());

  if (isNaN(total) || total < 0.2) {
    setFrequencies([]);
    setSelectedFreq(null);
    setErrors("Enter a valid amount (≥ 0.2 tBNB)");
    return;
  }

  const possibleFrequencies = [
    { 
      label: "Weekly", 
      intervals: Math.floor(months * 4.33), 
      minDuration: 1,
      frequencySeconds: 7 * 24 * 3600
    },
    { 
      label: "Monthly", 
      intervals: months, 
      minDuration: 1,
      frequencySeconds: 30 * 24 * 3600
    },
    { 
      label: "Quarterly", 
      intervals: Math.floor(months / 3), 
      minDuration: 3, // Allow quarterly from 3 months
      frequencySeconds: 90 * 24 * 3600
    },
    // ADD: Yearly frequency for longer tenures
    { 
      label: "Yearly", 
      intervals: Math.floor(months / 12), 
      minDuration: 12, // Only for 1+ year tenures
      frequencySeconds: 365 * 24 * 3600
    },
  ];

  const valid: FrequencyOption[] = possibleFrequencies
    .filter(f => months >= f.minDuration)
    .map((f) => ({
      label: f.label,
      sipAmount: parseFloat((total / f.intervals).toFixed(4)),
      intervals: f.intervals,
      frequencySeconds: f.frequencySeconds
    }))
    .filter((f) => f.sipAmount >= 0.006 && f.intervals >= 2 && isFinite(f.sipAmount));

  setFrequencies(valid);
  setSelectedFreq(valid[0] || null);
  setErrors(valid.length === 0 ? "No valid frequency options for this amount and duration." : "");
};


  useEffect(() => {
    if (showSIPForm) {
      calculateFrequencies();
    }
  }, [totalInvestment, maturity, showSIPForm]);

  useEffect(() => {
    if (isHydrated && showSIPForm) {
      const error = validateInputs();
      setErrors(error);
    }
  }, [selectedFreq, isBNBTestnet, isConnected, totalInvestment, isHydrated, showSIPForm]);

  // Smart contract interactions
  const { 
    createSIP, 
    isLoading: createLoading, 
    isSuccess: createSuccess, 
    error: createError,
    canCreate
  } = useCreateNativeSIP(
    currentPool,
    selectedFreq?.sipAmount?.toString() || "0",
    selectedFreq?.frequencySeconds || 0,
    Math.floor(Date.now() / 1000) + (parseInt(maturity) * 30 * 24 * 3600),
    address || "0x0000000000000000000000000000000000000000",
    totalInvestment.toString()
  );

  const { 
    executeSIP, 
    isLoading: executeLoading, 
    isSuccess: executeSuccess,
    canExecute: canExecuteContract
  } = useExecuteSIP(selectedSIPPool);
  
  const { 
    finalizeSIP, 
    isLoading: finalizeLoading, 
    isSuccess: finalizeSuccess,
    canFinalize: canFinalizeContract
  } = useFinalizeSIP(selectedSIPPool);

  const handleCreateSIP = async () => {
    const error = validateInputs();
    if (error) {
      setErrors(error);
      return;
    }

    if (!canCreate) {
      setErrors("Contract interaction not ready. Please check your inputs.");
      return;
    }

    try {
      setTxStatus("Creating SIP plan...");
      // Generate a new unique pool name for each SIP creation
      setCurrentPool(generatePoolName(address || "", Date.now()));
      createSIP?.();
    } catch (err) {
      console.error("Error creating SIP:", err);
      setErrors("Failed to create SIP");
      setTxStatus("");
    }
  };

  const handleExecuteSIP = async (poolName: string) => {
    if (!canExecuteContract) return;
    try {
      setSelectedSIPPool(poolName);
      setTxStatus("Executing SIP interval...");
      executeSIP?.();
    } catch (err) {
      console.error("Error executing SIP:", err);
      setTxStatus("");
    }
  };

  const handleFinalizeSIP = async (poolName: string) => {
    if (!canFinalizeContract) return;
    try {
      setSelectedSIPPool(poolName);
      setTxStatus("Finalizing SIP...");
      finalizeSIP?.();
    } catch (err) {
      console.error("Error finalizing SIP:", err);
      setTxStatus("");
    }
  };

  // Success handling
  useEffect(() => {
    if (createSuccess) {
      setShowSIPForm(false);
      setTxStatus("SIP created successfully!");
      refetchAllSIPs();
      setTimeout(() => setTxStatus(""), 5000);
    }
  }, [createSuccess]);

  useEffect(() => {
    if (executeSuccess) {
      setTxStatus("SIP executed successfully!");
      refetchAllSIPs();
      setTimeout(() => setTxStatus(""), 5000);
    }
  }, [executeSuccess]);

  useEffect(() => {
    if (finalizeSuccess) {
      setTxStatus("SIP finalized successfully!");
      refetchAllSIPs();
      setTimeout(() => setTxStatus(""), 5000);
    }
  }, [finalizeSuccess]);

  // Error handling
  useEffect(() => {
    if (createError) {
      setTxStatus(`Error: ${createError.message}`);
      setTimeout(() => setTxStatus(""), 5000);
    }
  }, [createError]);

  if (!isHydrated) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
      </div>
    );
  }

  // Calculate portfolio totals
  const totalPortfolioValue = getTotalPortfolioValue(allSIPs);
  const totalExecutedAmount = getTotalExecutedAmount(allSIPs);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            🥞 <span>OnchainSIP</span>
            <span className={styles.logoVersion}>v1.0 • BSC Testnet</span>
          </div>
          
          <div className={styles.headerRight}>
            {isConnected && (
              <div className={styles.networkStatus}>
                <div className={`${styles.networkDot} ${isBNBTestnet ? styles.networkDotConnected : styles.networkDotError}`}></div>
                <span className={styles.networkText}>
                  {isBNBTestnet ? 'BNB Testnet' : 'Wrong Network'}
                </span>
              </div>
            )}
            <ConnectButton 
              showBalance={{
                smallScreen: false,
                largeScreen: true,
              }}
              chainStatus={{
                smallScreen: 'icon',
                largeScreen: 'full',
              }}
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />
          </div>
        </div>
      </header>

      {/* Transaction Status */}
      {txStatus && (
        <div className={`${styles.txStatus} ${txStatus.includes('Error') ? styles.txStatusError : styles.txStatusSuccess}`}>
          {txStatus}
        </div>
      )}

      {/* Main Content */}
      <main className={styles.main}>
        {!isConnected ? (
          /* Welcome Screen */
          <div className={styles.welcomeContainer}>
            <h1 className={styles.welcomeTitle}>
              Build Wealth with Crypto SIPs
            </h1>
            <p className={styles.welcomeSubtitle}>
              Automate your crypto investments with systematic investment plans on BNB Chain
            </p>
            
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button 
                  onClick={openConnectModal}
                  className={styles.connectButton}
                >
                  Connect Wallet to Start
                </button>
              )}
            </ConnectButton.Custom>
          </div>
        ) : (
          /* Dashboard */
          <div className={styles.dashboard}>
            
            {/* Network Warning */}
            {!isBNBTestnet && (
              <div className={styles.networkWarning}>
                <p className={styles.networkWarningTitle}>
                  Please switch to BNB Testnet to use OnchainSIP
                </p>
                <p className={styles.networkWarningSubtitle}>
                  Contract Address: 0xd8540A08f770BAA3b66C4d43728CDBDd1d7A9c3b
                </p>
              </div>
            )}

            {/* Portfolio Summary */}
            {hasActiveSIPs && (
              <div className={styles.portfolioSummary}>
                <h2 className={styles.portfolioTitle}>Portfolio Overview</h2>
                <div className={styles.portfolioStats}>
                  <div className={styles.portfolioItem}>
                    <p className={styles.portfolioLabel}>Total Invested</p>
                    <p className={styles.portfolioValue}>{totalPortfolioValue} tBNB</p>
                  </div>
                  <div className={styles.portfolioItem}>
                    <p className={styles.portfolioLabel}>Total Executed</p>
                    <p className={styles.portfolioValue}>{totalExecutedAmount} tBNB</p>
                  </div>
                  <div className={styles.portfolioItem}>
                    <p className={styles.portfolioLabel}>Active SIPs</p>
                    <p className={styles.portfolioValue}>{allSIPs.length}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className={styles.quickActions}>
              <button
                onClick={() => setShowSIPForm(true)}
                disabled={!isBNBTestnet}
                className={`${styles.actionButton} ${isBNBTestnet ? styles.actionButtonPrimary : styles.actionButtonDisabled}`}
              >
                + Create New SIP
              </button>
              
              <button
                onClick={() => refetchAllSIPs()}
                disabled={!isBNBTestnet}
                className={`${styles.actionButton} ${isBNBTestnet ? styles.actionButtonSecondary : styles.actionButtonDisabled}`}
              >
                🔄 Refresh SIPs
              </button>
            </div>

            {/* All SIP Plans Display */}
            <div className={styles.sipPlanCard}>
              <h2 className={styles.sipPlanTitle}>Your SIP Plans</h2>
              
              {sipsLoading ? (
                <div className={styles.loadingText}>
                  <p>Loading SIP plans...</p>
                </div>
              ) : sipsError ? (
                <div className={styles.errorDisplay}>
                  <p className={styles.errorMessage}>Error loading SIPs: {sipsError.message}</p>
                  <button onClick={refetchAllSIPs} className={styles.refreshButton}>
                    🔄 Retry
                  </button>
                </div>
              ) : allSIPs.length > 0 ? (
                <div className={styles.sipsContainer}>
                  {allSIPs.map((sip, index) => {
                    const formattedPlan = formatSIPData(sip);
                    if (!formattedPlan) return null;
                    
                    return (
                      <div key={`${sip.poolName}-${index}`} className={styles.planDetails}>
                        <div className={styles.sipHeader}>
                          <h3>SIP Plan #{index + 1}</h3>
                          <span className={styles.sipPool}>Pool: {sip.poolName}</span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progressBarFill}
                            style={{ width: `${formattedPlan.progress}%` }}
                          ></div>
                        </div>

                        <div className={styles.statsGrid}>
                          <div className={styles.statItem}>
                            <p className={styles.statLabel}>Total Amount</p>
                            <p className={`${styles.statValue} ${styles.statValueSuccess}`}>
                              {formattedPlan.totalAmount} tBNB
                            </p>
                          </div>
                          <div className={styles.statItem}>
                            <p className={styles.statLabel}>Per Interval</p>
                            <p className={`${styles.statValue} ${styles.statValuePrimary}`}>
                              {formattedPlan.amountPerInterval} tBNB
                            </p>
                          </div>
                          <div className={styles.statItem}>
                            <p className={styles.statLabel}>Executed</p>
                            <p className={`${styles.statValue} ${styles.statValueWarning}`}>
                              {formattedPlan.executedAmount} tBNB
                            </p>
                          </div>
                          <div className={styles.statItem}>
                            <p className={styles.statLabel}>Remaining</p>
                            <p className={`${styles.statValue} ${styles.statValueMuted}`}>
                              {formattedPlan.remainingAmount} tBNB
                            </p>
                          </div>
                        </div>

                        {/* Time Information */}
                        <div className={styles.timeInfo}>
                          <div className={styles.timeItem}>
                            <p className={styles.timeLabel}>Next Execution</p>
                            <p className={`${styles.timeValue} ${formattedPlan.canExecute ? styles.timeReady : styles.timePending}`}>
                              {formattedPlan.nextExecution.toLocaleDateString()} at {formattedPlan.nextExecution.toLocaleTimeString()}
                            </p>
                          </div>
                          <div className={styles.timeItem}>
                            <p className={styles.timeLabel}>Maturity</p>
                            <p className={`${styles.timeValue} ${formattedPlan.canFinalize ? styles.timeReady : styles.timePending}`}>
                              {formattedPlan.maturity.toLocaleDateString()}
                            </p>
                          </div>
                          <div className={styles.timeItem}>
                            <p className={styles.timeLabel}>Frequency</p>
                            <p className={styles.timeValue}>Every {formattedPlan.frequencyDays} days</p>
                          </div>
                        </div>
                        
                        {/* Action Buttons for this SIP */}
                        <div className={styles.actionButtons}>
                          <button
                            onClick={() => handleExecuteSIP(sip.poolName || '')}
                            disabled={!isBNBTestnet || executeLoading || !formattedPlan.canExecute}
                            className={`${styles.executeButton} ${(!isBNBTestnet || !formattedPlan.canExecute) ? styles.actionButtonDisabled : ''}`}
                          >
                            {executeLoading && selectedSIPPool === sip.poolName ? 'Executing...' : 'Execute SIP'}
                          </button>
                          
                          <button
                            onClick={() => handleFinalizeSIP(sip.poolName || '')}
                            disabled={!isBNBTestnet || finalizeLoading || !formattedPlan.canFinalize}
                            className={`${styles.finalizeButton} ${(!isBNBTestnet || !formattedPlan.canFinalize) ? styles.actionButtonDisabled : ''}`}
                          >
                            {finalizeLoading && selectedSIPPool === sip.poolName ? 'Finalizing...' : 'Finalize SIP'}
                          </button>

                          <div className={styles.statusIndicator}>
                            {formattedPlan.canExecute && (
                              <span className={styles.statusReady}>● Ready to Execute</span>
                            )}
                            {formattedPlan.canFinalize && (
                              <span className={styles.statusMatured}>● Matured</span>
                            )}
                            {!formattedPlan.canExecute && !formattedPlan.canFinalize && (
                              <span className={styles.statusPending}>● Pending</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <p className={styles.emptyStateTitle}>No SIP Plans Found</p>
                  <p className={styles.emptyStateSubtitle}>
                    {!isBNBTestnet 
                      ? "Connect to BNB Testnet to view your SIPs"
                      : "Create your first SIP plan to get started with automated crypto investing"
                    }
                  </p>
                </div>
              )}
            </div>

            {/* SIP Creation Form Modal */}
            {showSIPForm && (
              <div className={styles.modal}>
                <div className={styles.modalContent}>
                  <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>Create SIP Plan</h3>
                    <button
                      onClick={() => setShowSIPForm(false)}
                      className={styles.modalCloseButton}
                    >
                      ×
                    </button>
                  </div>

                  {/* Asset Display */}
                  <div className={styles.assetDisplay}>
                    <div className={styles.assetDisplayContent}>
                      <div>
                        <p className={styles.assetLabel}>Investment Asset</p>
                        <p className={styles.assetValue}>tBNB</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p className={styles.assetLabel}>Network</p>
                        <p className={styles.networkValue}>BNB Testnet</p>
                      </div>
                    </div>
                  </div>

                  {/* Total Investment */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Total Investment Amount
                    </label>
                    <div className={styles.inputContainer}>
                      <input
                        type="number"
                        min={0.2}
                        step={0.1}
                        placeholder="0.2"
                        value={totalInvestment}
                        onChange={(e) => setTotalInvestment(Number(e.target.value))}
                        className={styles.input}
                      />
                      <p className={styles.inputHelp}>Minimum: 0.2 tBNB</p>
                    </div>
                  </div>

                  {/* Maturity Period */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Investment Duration
                    </label>
                    <div className={styles.inputContainer}>
                      <select
                        value={maturity}
                        onChange={(e) => setMaturity(e.target.value)}
                        className={styles.select}
                      >
                        {maturityOptions.map((option) => (
                          <option key={option.value} value={option.value} style={{ background: '#374151' }}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Error Display */}
                  {errors && (
                    <div className={styles.errorDisplay}>
                      <p className={styles.errorMessage}>{errors}</p>
                    </div>
                  )}

                  {/* Frequency Options */}
                  {frequencies.length > 0 && !errors && (
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        Choose SIP Frequency
                      </label>
                      <div className={styles.frequencyOptions}>
                        {frequencies.map((f) => (
                          <label
                            key={f.label}
                            className={`${styles.frequencyOption} ${selectedFreq?.label === f.label ? styles.frequencyOptionSelected : styles.frequencyOptionDefault}`}
                            onClick={() => setSelectedFreq(f)}
                          >
                            <div className={styles.frequencyContent}>
                              <input
                                type="radio"
                                name="frequency"
                                value={f.label}
                                checked={selectedFreq?.label === f.label}
                                onChange={() => setSelectedFreq(f)}
                                className={styles.radioInput}
                              />
                              <div className={styles.frequencyDetails}>
                                <span className={styles.frequencyName}>{f.label}</span>
                                <p className={styles.frequencyCount}>{f.intervals} payments</p>
                              </div>
                            </div>
                            <div className={styles.frequencyAmount}>
                              <p className={styles.amountValue}>
                                {f.sipAmount} tBNB
                              </p>
                              <p className={styles.amountLabel}>per payment</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className={styles.modalActions}>
                    <button
                      onClick={() => setShowSIPForm(false)}
                      className={styles.cancelButton}
                    >
                      Cancel
                    </button>
                    {selectedFreq && !errors && (
                      <button
                        onClick={handleCreateSIP}
                        disabled={createLoading || !canCreate}
                        className={`${styles.submitButton} ${(canCreate && !createLoading) ? styles.submitButtonEnabled : styles.submitButtonDisabled}`}
                      >
                        {createLoading ? 'Creating...' : 'Create SIP Plan'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
