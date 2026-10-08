import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { User } from '../api';
import { Icon } from '../Artwork';
import { colors as c } from '../theme';

import {
  createAuthorityIncident,
  deleteAuthorityIncident,
  getAuthorityIncidents,
  getAuthorityNetwork,
  getAuthorityOverview,
  updateAuthorityIncident,
} from './authorityApi';

import type {
  AuthorityIncident,
  AuthorityOverview,
  AuthorityService,
} from './authorityApi';

type Screen =
  | 'overview'
  | 'network'
  | 'website';

type Props = {
  user: User;
  onBack: () => void;
  onSignOut: () => void;
  onOpenWebDashboard?: () => void;
};

const authorityBlue = '#3F5FB8';
const authorityLight = '#E9EEFF';
const mapBackground = '#E7F2EF';

function money(value: number) {
  if (value >= 1_000_000) {
    return `Rs. ${(value / 1_000_000).toFixed(1)}M`;
  }

  return `Rs. ${value.toLocaleString()}`;
}

export default function AuthorityDashboardScreen({
  user,
  onBack,
  onSignOut,
  onOpenWebDashboard,
}: Props) {
  const insets = useSafeAreaInsets();

  const [screen, setScreen] =
    useState<Screen>('overview');

  const [overview, setOverview] =
    useState<AuthorityOverview | null>(null);

  const [services, setServices] =
    useState<AuthorityService[]>([]);

  const [incidents, setIncidents] =
    useState<AuthorityIncident[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [title, setTitle] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [route, setRoute] =
    useState('');

  const [severity, setSeverity] =
    useState<'low' | 'medium' | 'high'>(
      'medium'
    );

  const [saving, setSaving] =
    useState(false);

  const [deleteId, setDeleteId] =
    useState<string | null>(null);

    const [editingId, setEditingId] =
  useState<string | null>(null);

const [editTitle, setEditTitle] =
  useState('');

const [editDescription, setEditDescription] =
  useState('');

const [editRoute, setEditRoute] =
  useState('');

const [editSeverity, setEditSeverity] =
  useState<'low' | 'medium' | 'high'>(
    'medium'
  );

const [editSaving, setEditSaving] =
  useState(false);

  async function loadAll() {
    setLoading(true);
    setError('');

    try {
      const [
        overviewResult,
        networkResult,
        incidentResult,
      ] = await Promise.all([
        getAuthorityOverview(),
        getAuthorityNetwork(),
        getAuthorityIncidents(),
      ]);

      setOverview(overviewResult);
      setServices(networkResult.services);
      setIncidents(
        incidentResult.incidents
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not load Authority data.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function createIncident() {
    if (
      !title.trim() ||
      !description.trim() ||
      !route.trim()
    ) {
      setError(
        'Complete all incident fields.'
      );
      return;
    }

    setSaving(true);
    setError('');

    try {
      const result =
        await createAuthorityIncident({
          title: title.trim(),
          description:
            description.trim(),
          route: route.trim(),
          severity,
        });

      setIncidents(current => [
        result.incident,
        ...current,
      ]);

      setTitle('');
      setDescription('');
      setRoute('');
      setSeverity('medium');

      const refreshed =
        await getAuthorityOverview();

      setOverview(refreshed);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not create incident.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(
    incident: AuthorityIncident,
    status:
      | 'acknowledged'
      | 'resolved'
  ) {
    try {
      const result =
        await updateAuthorityIncident(
          incident.id,
          { status }
        );

      setIncidents(current =>
        current.map(item =>
          item.id === incident.id
            ? result.incident
            : item
        )
      );

      setOverview(
        await getAuthorityOverview()
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not update incident.'
      );
    }
  }
function beginEdit(
  incident: AuthorityIncident
) {
  if (incident.createdBy !== user.id) {
    setError(
      'Only the officer who created this incident can edit it.'
    );
    return;
  }

  setEditingId(incident.id);

  setEditTitle(incident.title);
  setEditDescription(
    incident.description
  );
  setEditRoute(incident.route);
  setEditSeverity(incident.severity);

  setDeleteId(null);
  setError('');
}

function cancelEdit() {
  setEditingId(null);

  setEditTitle('');
  setEditDescription('');
  setEditRoute('');
  setEditSeverity('medium');

  setEditSaving(false);
}

async function saveEdit(
  incident: AuthorityIncident
) {
  if (incident.createdBy !== user.id) {
    setError(
      'Only the officer who created this incident can edit it.'
    );
    return;
  }

  if (
    !editTitle.trim() ||
    !editDescription.trim() ||
    !editRoute.trim()
  ) {
    setError(
      'Complete all incident fields.'
    );
    return;
  }

  setEditSaving(true);
  setError('');

  try {
    const result =
      await updateAuthorityIncident(
        incident.id,
        {
          title: editTitle.trim(),
          description:
            editDescription.trim(),
          route: editRoute.trim(),
          severity: editSeverity,
        }
      );

    setIncidents(current =>
      current.map(item =>
        item.id === incident.id
          ? result.incident
          : item
      )
    );

    cancelEdit();

    setOverview(
      await getAuthorityOverview()
    );
  } catch (e) {
    setError(
      e instanceof Error
        ? e.message
        : 'Could not edit incident.'
    );
  } finally {
    setEditSaving(false);
  }
}
  async function removeIncident(
    id: string
  ) {
    try {
      await deleteAuthorityIncident(id);

      setIncidents(current =>
        current.filter(
          incident =>
            incident.id !== id
        )
      );

      setDeleteId(null);

      setOverview(
        await getAuthorityOverview()
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not delete incident.'
      );
    }
  }

  const metrics = overview?.metrics;

  function header(
    titleText: string,
    backAction: () => void
  ) {
    return (
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={backAction}
          style={styles.headerButton}
        >
          <Icon
            name="back"
            size={20}
            color={c.navy}
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          {titleText}
        </Text>

        <View style={styles.headerButton} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.stage}>
        <View
          style={[
            styles.screen,
            {
              paddingTop: Math.max(
                insets.top,
                12
              ),
            },
          ]}
        >
          {header(
            'System monitoring',
            onBack
          )}

          <View style={styles.loading}>
            <ActivityIndicator
              color={authorityBlue}
            />

            <Text style={styles.muted}>
              Loading network data...
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.stage}>
      <View
        style={[
          styles.screen,
          {
            paddingTop: Math.max(
              insets.top,
              12
            ),
            paddingBottom: Math.max(
              insets.bottom,
              8
            ),
          },
        ]}
      >
        {screen === 'overview' &&
          header(
            'System monitoring',
            onBack
          )}

        {screen === 'network' &&
          header(
            'Network & alerts',
            () => setScreen('overview')
          )}

        {screen === 'website' &&
          header(
            'Website dashboard',
            () => setScreen('overview')
          )}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={
            styles.content
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
        >
          {!!error && (
            <Pressable
              onPress={() => void loadAll()}
              style={styles.errorBox}
            >
              <Text style={styles.errorText}>
                {error}
              </Text>

              <Text style={styles.retry}>
                Tap to retry
              </Text>
            </Pressable>
          )}

          {screen === 'overview' &&
            overview &&
            metrics && (
              <>
                <Text style={styles.eyebrow}>
                  NETWORK OVERVIEW
                </Text>

                <Text style={styles.heroTitle}>
                  Keep the network moving.
                </Text>

                <View
                  style={styles.revenueCard}
                >
                  <Text
                    style={
                      styles.metricLabel
                    }
                  >
                    Total revenue
                  </Text>

                  <Text
                    style={
                      styles.revenueValue
                    }
                  >
                    {money(
                      metrics.monthlyRevenue
                    )}
                  </Text>

                  <Text
                    style={
                      styles.metricCaption
                    }
                  >
                    This month
                  </Text>
                </View>

                <View style={styles.statRow}>
                  <View
                    style={styles.smallStat}
                  >
                    <Text
                      style={
                        styles.metricLabel
                      }
                    >
                      Active buses
                    </Text>

                    <Text
                      style={
                        styles.smallStatValue
                      }
                    >
                      {
                        metrics.activeBuses
                      }
                    </Text>

                    <Text
                      style={
                        styles.metricCaption
                      }
                    >
                      Operational
                    </Text>
                  </View>

                  <View
                    style={styles.smallStat}
                  >
                    <Text
                      style={
                        styles.metricLabel
                      }
                    >
                      On-time rate
                    </Text>

                    <Text
                      style={
                        styles.smallStatValue
                      }
                    >
                      {
                        metrics.onTimePerformance
                      }
                      %
                    </Text>

                    <Text
                      style={
                        styles.metricCaption
                      }
                    >
                      Excellent
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.performanceCard
                  }
                >
                  <Text
                    style={
                      styles.performanceTitle
                    }
                  >
                    System performance
                  </Text>

                  <Text
                    style={
                      styles.performanceText
                    }
                  >
                    On-time{' '}
                    {
                      metrics.onTimePerformance
                    }
                    % {'   •   '}
                    Utilization{' '}
                    {
                      metrics.utilization
                    }
                    %
                  </Text>

                  <Text
                    style={
                      styles.performanceText
                    }
                  >
                    Digital ticket adoption{' '}
                    {
                      metrics.digitalAdoption
                    }
                    %
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    setScreen('network')
                  }
                  style={({ pressed }) => [
                    styles.blueButton,
                    pressed &&
                      styles.pressed,
                  ]}
                >
                  <Text
                    style={
                      styles.blueButtonText
                    }
                  >
                    View network & alerts
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    setScreen('website')
                  }
                  style={({ pressed }) => [
                    styles.blueButton,
                    pressed &&
                      styles.pressed,
                  ]}
                >
                  <Text
                    style={
                      styles.blueButtonText
                    }
                  >
                    Open website dashboard
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={onSignOut}
                  style={styles.whiteButton}
                >
                  <Text
                    style={
                      styles.whiteButtonText
                    }
                  >
                    Sign out
                  </Text>
                </Pressable>
              </>
            )}

          {screen === 'network' &&
            overview &&
            metrics && (
              <>
                <Text style={styles.heroTitle}>
                  Real-time network status
                </Text>

                <NetworkMap />

                <Text style={styles.mapCaption}>
                  Illustrative map • Current
                  network monitoring
                </Text>

                <Text
                  style={styles.sectionTitle}
                >
                  System performance
                </Text>

                <PerformanceLine
                  label="On-time performance"
                  value={`${metrics.onTimePerformance}%`}
                />

                <PerformanceLine
                  label="Route utilization"
                  value={`${metrics.utilization}%`}
                />

                <PerformanceLine
                  label="Digital ticket adoption"
                  value={`${metrics.digitalAdoption}%`}
                />

                <PerformanceLine
                  label="Active buses"
                  value={`${metrics.activeBuses}`}
                />

                <Text
                  style={styles.sectionTitle}
                >
                  Service coverage
                </Text>

                {services.map(service => (
                  <View
                    key={service.id}
                    style={
                      styles.serviceCard
                    }
                  >
                    <View
                      style={styles.row}
                    >
                      <Text
                        style={
                          styles.serviceName
                        }
                      >
                        {service.name}
                      </Text>

                      <Text
                        style={
                          service.status ===
                          'operational'
                            ? styles.good
                            : styles.warning
                        }
                      >
                        {service.status}
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.coverageText
                      }
                    >
                      {service.coverage}%
                      coverage
                    </Text>

                    <View
                      style={
                        styles.progressTrack
                      }
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${service.coverage}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}

                <Pressable
                  onPress={() =>
                    setScreen('website')
                  }
                  style={styles.blueButton}
                >
                  <Text
                    style={
                      styles.blueButtonText
                    }
                  >
                    Open website dashboard
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    setScreen('overview')
                  }
                  style={styles.whiteButton}
                >
                  <Text
                    style={
                      styles.whiteButtonText
                    }
                  >
                    Back to overview
                  </Text>
                </Pressable>

                <View
                  style={
                    styles.divider
                  }
                />

                <Text style={styles.eyebrow}>
                  PRIORITY ALERTS
                </Text>

                <Text
                  style={styles.sectionTitle}
                >
                  Incident management
                </Text>

                <Text
                  style={styles.sectionBody}
                >
                  Record, acknowledge and
                  resolve network incidents.
                </Text>

                <View
                  style={
                    styles.incidentForm
                  }
                >
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Incident title"
                    placeholderTextColor={
                      c.muted
                    }
                    style={styles.input}
                  />

                  <TextInput
                    value={route}
                    onChangeText={setRoute}
                    placeholder="Route"
                    placeholderTextColor={
                      c.muted
                    }
                    style={styles.input}
                  />

                  <TextInput
                    value={description}
                    onChangeText={
                      setDescription
                    }
                    placeholder="Description"
                    placeholderTextColor={
                      c.muted
                    }
                    multiline
                    style={[
                      styles.input,
                      styles.textArea,
                    ]}
                  />

                  <View
                    style={
                      styles.severityRow
                    }
                  >
                    {(
                      [
                        'low',
                        'medium',
                        'high',
                      ] as const
                    ).map(value => (
                      <Pressable
                        key={value}
                        onPress={() =>
                          setSeverity(
                            value
                          )
                        }
                        style={[
                          styles.severityButton,
                          severity ===
                            value &&
                            styles.severitySelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.severityText,
                            severity ===
                              value &&
                              styles.severityTextSelected,
                          ]}
                        >
                          {value}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Pressable
                    disabled={saving}
                    onPress={() =>
                      void createIncident()
                    }
                    style={styles.blueButton}
                  >
                    <Text
                      style={
                        styles.blueButtonText
                      }
                    >
                      {saving
                        ? 'Saving...'
                        : 'Report incident'}
                    </Text>
                  </Pressable>
                </View>

                {incidents.map(incident => {
  const isCreator =
    incident.createdBy === user.id;

  const isEditing =
    editingId === incident.id;

  return (
    <View
      key={incident.id}
      style={styles.incidentCard}
    >
      <View style={styles.row}>
        <Text
          style={styles.incidentTitle}
        >
          {incident.title}
        </Text>

        <Text
          style={[
            styles.severityLabel,
            incident.severity === 'high'
              ? styles.danger
              : incident.severity ===
                  'medium'
                ? styles.warning
                : styles.good,
          ]}
        >
          {incident.severity}
        </Text>
      </View>

      <Text
        style={
          styles.incidentDescription
        }
      >
        {incident.description}
      </Text>

      <Text
        style={styles.incidentMeta}
      >
        Route {incident.route}
        {' · '}
        {incident.status}
      </Text>

      <Text
        style={styles.incidentMeta}
      >
        Reported by{' '}
        {incident.createdByName}
        {isCreator ? ' (you)' : ''}
      </Text>

      {isEditing ? (
        <View style={styles.editForm}>
          <Text style={styles.editHeading}>
            Edit incident
          </Text>

          <TextInput
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="Incident title"
            placeholderTextColor={
              c.muted
            }
            style={styles.input}
          />

          <TextInput
            value={editRoute}
            onChangeText={setEditRoute}
            placeholder="Route"
            placeholderTextColor={
              c.muted
            }
            style={styles.input}
          />

          <TextInput
            value={editDescription}
            onChangeText={
              setEditDescription
            }
            placeholder="Description"
            placeholderTextColor={
              c.muted
            }
            multiline
            style={[
              styles.input,
              styles.textArea,
            ]}
          />

          <Text
            style={
              styles.editFieldLabel
            }
          >
            Severity
          </Text>

          <View
            style={styles.severityRow}
          >
            {(
              [
                'low',
                'medium',
                'high',
              ] as const
            ).map(value => (
              <Pressable
                key={value}
                disabled={editSaving}
                onPress={() =>
                  setEditSeverity(
                    value
                  )
                }
                style={[
                  styles.severityButton,
                  editSeverity ===
                    value &&
                    styles.severitySelected,
                ]}
              >
                <Text
                  style={[
                    styles.severityText,
                    editSeverity ===
                      value &&
                      styles.severityTextSelected,
                  ]}
                >
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>

          <View
            style={styles.editActions}
          >
            <Pressable
              disabled={editSaving}
              onPress={cancelEdit}
              style={
                styles.editCancelButton
              }
            >
              <Text
                style={
                  styles.softButtonText
                }
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              disabled={editSaving}
              onPress={() =>
                void saveEdit(
                  incident
                )
              }
              style={[
                styles.editSaveButton,
                editSaving &&
                  styles.disabledButton,
              ]}
            >
              {editSaving ? (
                <ActivityIndicator
                  color={c.white}
                />
              ) : (
                <Text
                  style={
                    styles.blueButtonText
                  }
                >
                  Save changes
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          {incident.status ===
            'open' && (
            <Pressable
              onPress={() =>
                void changeStatus(
                  incident,
                  'acknowledged'
                )
              }
              style={
                styles.softButton
              }
            >
              <Text
                style={
                  styles.softButtonText
                }
              >
                Acknowledge
              </Text>
            </Pressable>
          )}

          {incident.status !==
            'resolved' && (
            <Pressable
              onPress={() =>
                void changeStatus(
                  incident,
                  'resolved'
                )
              }
              style={
                styles.blueSmallButton
              }
            >
              <Text
                style={
                  styles.blueButtonText
                }
              >
                Resolve
              </Text>
            </Pressable>
          )}

          {isCreator && (
            <Pressable
              onPress={() =>
                beginEdit(incident)
              }
              style={styles.editButton}
            >
              <Text
                style={
                  styles.editButtonText
                }
              >
                Edit incident
              </Text>
            </Pressable>
          )}

          {isCreator && (
            <>
              {deleteId !==
              incident.id ? (
                <Pressable
                  onPress={() =>
                    setDeleteId(
                      incident.id
                    )
                  }
                  style={
                    styles.deleteButton
                  }
                >
                  <Text
                    style={
                      styles.deleteText
                    }
                  >
                    Delete
                  </Text>
                </Pressable>
              ) : (
                <View
                  style={
                    styles.deleteConfirm
                  }
                >
                  <Text
                    style={
                      styles.deleteWarning
                    }
                  >
                    Delete this incident?
                  </Text>

                  <View
                    style={
                      styles.actionRow
                    }
                  >
                    <Pressable
                      onPress={() =>
                        setDeleteId(
                          null
                        )
                      }
                      style={
                        styles.softSmall
                      }
                    >
                      <Text
                        style={
                          styles.softButtonText
                        }
                      >
                        Cancel
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        void removeIncident(
                          incident.id
                        )
                      }
                      style={
                        styles.deleteSmall
                      }
                    >
                      <Text
                        style={
                          styles.deleteText
                        }
                      >
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          )}
        </>
      )}
    </View>
  );
})}
              </>
            )}

          {screen === 'website' && (
            <>
              <Text style={styles.heroTitle}>
                Authority Officer portal
              </Text>

              <Text style={styles.websiteSubtitle}>
                Desktop overview, connected
                to your app.
              </Text>

              <WebPreview />

              <Text
                style={
                  styles.websiteHeadline
                }
              >
                System monitoring at a glance
              </Text>

              <Text
                style={styles.websiteBody}
              >
                Revenue, active buses,
                network coverage and
                performance metrics.
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  onOpenWebDashboard?.()
                }
                style={styles.blueButton}
              >
                <Text
                  style={
                    styles.blueButtonText
                  }
                >
                  Explore full web dashboard
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setScreen('overview')
                }
                style={styles.whiteButton}
              >
                <Text
                  style={
                    styles.whiteButtonText
                  }
                >
                  Back to mobile dashboard
                </Text>
              </Pressable>
            </>
          )}

          <View style={{ height: 26 }} />

          <Text
            style={
              styles.signedInText
            }
          >
            Signed in as {user.name}
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

function PerformanceLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.performanceLine}>
      <Text
        style={styles.performanceLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.performanceValue}
      >
        {value}
      </Text>
    </View>
  );
}

function NetworkMap() {
  return (
    <View style={styles.mapCard}>
      <View
        style={[
          styles.mapRoad,
          styles.roadOne,
        ]}
      />

      <View
        style={[
          styles.mapRoad,
          styles.roadTwo,
        ]}
      />

      <View
        style={[
          styles.mapRoad,
          styles.roadThree,
        ]}
      />

      <View style={styles.river} />

      <View
        style={[
          styles.routeLine,
          styles.routeLineOne,
        ]}
      />

      <View
        style={[
          styles.routeLine,
          styles.routeLineTwo,
        ]}
      />

      <View
        style={[
          styles.mapDot,
          styles.dotWest,
        ]}
      />

      <View
        style={[
          styles.mapDot,
          styles.dotCentral,
        ]}
      />

      <View
        style={[
          styles.mapDot,
          styles.dotMiddle,
        ]}
      />

      <View
        style={[
          styles.mapDot,
          styles.dotNorth,
        ]}
      />

      <Text
        style={[
          styles.mapLabel,
          styles.labelWest,
        ]}
      >
        West
      </Text>

      <Text
        style={[
          styles.mapLabel,
          styles.labelCentral,
        ]}
      >
        Central
      </Text>

      <Text
        style={[
          styles.mapLabel,
          styles.labelNorth,
        ]}
      >
        North
      </Text>
    </View>
  );
}

function WebPreview() {
  return (
    <View style={styles.preview}>
      <View style={styles.previewSidebar}>
        <View
          style={styles.previewLogo}
        />

        {[1, 2, 3, 4, 5].map(item => (
          <View
            key={item}
            style={styles.previewNav}
          />
        ))}
      </View>

      <View style={styles.previewMain}>
        <View
          style={styles.previewTop}
        />

        <View
          style={styles.previewStats}
        >
          <View
            style={styles.previewStat}
          />
          <View
            style={styles.previewStat}
          />
          <View
            style={styles.previewStat}
          />
        </View>

        <View
          style={styles.previewLargeRow}
        >
          <View
            style={styles.previewMap}
          />

          <View
            style={styles.previewPanel}
          />
        </View>

        <View
          style={styles.previewBottom}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    backgroundColor: c.background,
  },

  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: c.background,
  },

  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    color: c.navy,
    fontSize: 17,
    fontWeight: '700',
  },

  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 30,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  eyebrow: {
    color: authorityBlue,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 14,
  },

  heroTitle: {
    color: c.navy,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '800',
    marginBottom: 22,
  },

  revenueCard: {
    backgroundColor: c.white,
    borderRadius: 17,
    padding: 20,
    marginBottom: 14,
  },

  metricLabel: {
    color: c.muted,
    fontSize: 12,
  },

  revenueValue: {
    color: authorityBlue,
    fontSize: 27,
    fontWeight: '800',
    marginTop: 10,
  },

  metricCaption: {
    color: c.muted,
    fontSize: 11,
    marginTop: 10,
  },

  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },

  smallStat: {
    flex: 1,
    minHeight: 110,
    borderRadius: 17,
    backgroundColor: c.white,
    padding: 18,
  },

  smallStatValue: {
    color: authorityBlue,
    fontSize: 27,
    fontWeight: '800',
    marginTop: 9,
  },

  performanceCard: {
    backgroundColor: authorityLight,
    borderRadius: 16,
    padding: 18,
    marginBottom: 22,
  },

  performanceTitle: {
    color: c.navy,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },

  performanceText: {
    color: c.muted,
    fontSize: 13,
    lineHeight: 21,
  },

  blueButton: {
    minHeight: 54,
    backgroundColor: authorityBlue,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  blueSmallButton: {
    minHeight: 42,
    backgroundColor: authorityBlue,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  blueButtonText: {
    color: c.white,
    fontSize: 14,
    fontWeight: '700',
  },

  whiteButton: {
    minHeight: 54,
    backgroundColor: c.white,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  whiteButtonText: {
    color: authorityBlue,
    fontSize: 14,
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.82,
  },

  mapCard: {
    height: 145,
    backgroundColor: mapBackground,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
    position: 'relative',
  },

  mapRoad: {
    position: 'absolute',
    height: 7,
    backgroundColor: c.white,
    width: 260,
  },

  roadOne: {
    top: 43,
    left: -14,
    transform: [{ rotate: '12deg' }],
  },

  roadTwo: {
    top: 87,
    left: 4,
    transform: [{ rotate: '-18deg' }],
  },

  roadThree: {
    top: 25,
    right: -70,
    transform: [{ rotate: '-12deg' }],
  },

  river: {
    position: 'absolute',
    width: 34,
    height: 180,
    backgroundColor: '#AFDCEB',
    right: 83,
    top: -17,
    transform: [{ rotate: '9deg' }],
  },

  routeLine: {
    position: 'absolute',
    height: 4,
    backgroundColor: authorityBlue,
  },

  routeLineOne: {
    width: 145,
    left: 40,
    top: 83,
    transform: [{ rotate: '-22deg' }],
  },

  routeLineTwo: {
    width: 122,
    right: 38,
    top: 69,
    transform: [{ rotate: '-24deg' }],
  },

  mapDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: authorityBlue,
    borderWidth: 2,
    borderColor: c.white,
  },

  dotWest: {
    left: 41,
    top: 88,
  },

  dotCentral: {
    left: 119,
    top: 56,
  },

  dotMiddle: {
    left: 183,
    top: 69,
  },

  dotNorth: {
    right: 50,
    top: 36,
  },

  mapLabel: {
    position: 'absolute',
    color: c.navy,
    fontSize: 9,
  },

  labelWest: {
    left: 28,
    top: 108,
  },

  labelCentral: {
    left: 111,
    top: 38,
  },

  labelNorth: {
    right: 40,
    top: 19,
  },

  mapCaption: {
    color: c.muted,
    fontSize: 10,
    marginBottom: 24,
  },

  sectionTitle: {
    color: c.navy,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 15,
  },

  sectionBody: {
    color: c.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: -7,
    marginBottom: 16,
  },

  performanceLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 17,
  },

  performanceLabel: {
    color: c.muted,
    fontSize: 14,
  },

  performanceValue: {
    color: c.muted,
    fontSize: 14,
  },

  serviceCard: {
    backgroundColor: c.white,
    borderRadius: 14,
    padding: 15,
    marginBottom: 10,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  serviceName: {
    color: c.navy,
    fontWeight: '700',
    fontSize: 14,
  },

  good: {
    color: '#00897B',
    fontWeight: '700',
    fontSize: 11,
  },

  warning: {
    color: '#D98600',
    fontWeight: '700',
    fontSize: 11,
  },

  danger: {
    color: c.error,
    fontWeight: '700',
    fontSize: 11,
  },

  coverageText: {
    color: c.muted,
    fontSize: 11,
    marginTop: 11,
    marginBottom: 7,
  },

  progressTrack: {
    height: 6,
    backgroundColor: c.background,
    borderRadius: 4,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: authorityBlue,
    borderRadius: 4,
  },

  divider: {
    height: 1,
    backgroundColor: c.border,
    marginVertical: 26,
  },

  incidentForm: {
    backgroundColor: c.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },

  input: {
    minHeight: 48,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 11,
    paddingHorizontal: 13,
    color: c.navy,
    marginBottom: 10,
  },

  textArea: {
    minHeight: 82,
    paddingTop: 12,
    textAlignVertical: 'top',
  },

  severityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },

  severityButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  severitySelected: {
    backgroundColor: authorityBlue,
    borderColor: authorityBlue,
  },

  severityText: {
    color: c.muted,
    fontSize: 11,
    textTransform: 'capitalize',
  },

  severityTextSelected: {
    color: c.white,
    fontWeight: '700',
  },

  incidentCard: {
    backgroundColor: c.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: c.border,
    padding: 15,
    marginBottom: 12,
  },

  incidentTitle: {
    flex: 1,
    color: c.navy,
    fontSize: 15,
    fontWeight: '800',
  },

  severityLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
  },

  incidentDescription: {
    color: c.navy,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },

  incidentMeta: {
    color: c.muted,
    fontSize: 11,
    marginTop: 7,
  },
  editForm: {
  marginTop: 16,
  paddingTop: 16,
  borderTopWidth: 1,
  borderTopColor: c.border,
},

editHeading: {
  color: c.navy,
  fontSize: 14,
  fontWeight: '800',
  marginBottom: 12,
},

editFieldLabel: {
  color: c.muted,
  fontSize: 11,
  fontWeight: '600',
  marginBottom: 8,
},

editActions: {
  flexDirection: 'row',
  gap: 8,
  marginTop: 2,
},

editCancelButton: {
  flex: 1,
  minHeight: 44,
  borderRadius: 11,
  backgroundColor: authorityLight,
  alignItems: 'center',
  justifyContent: 'center',
},

editSaveButton: {
  flex: 1,
  minHeight: 44,
  borderRadius: 11,
  backgroundColor: authorityBlue,
  alignItems: 'center',
  justifyContent: 'center',
},

editButton: {
  minHeight: 42,
  marginTop: 8,
  borderRadius: 11,
  borderWidth: 1,
  borderColor: authorityBlue,
  alignItems: 'center',
  justifyContent: 'center',
},

editButtonText: {
  color: authorityBlue,
  fontWeight: '700',
  fontSize: 12,
},

disabledButton: {
  opacity: 0.65,
},

  softButton: {
    minHeight: 42,
    borderRadius: 11,
    backgroundColor: authorityLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  softButtonText: {
    color: authorityBlue,
    fontWeight: '700',
    fontSize: 12,
  },

  deleteButton: {
    minHeight: 40,
    marginTop: 8,
    borderWidth: 1,
    borderColor: c.error,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteText: {
    color: c.error,
    fontWeight: '700',
    fontSize: 12,
  },

  deleteConfirm: {
    marginTop: 10,
  },

  deleteWarning: {
    color: c.error,
    fontSize: 12,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },

  softSmall: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: authorityLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteSmall: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.error,
    alignItems: 'center',
    justifyContent: 'center',
  },

  websiteSubtitle: {
    color: c.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: -13,
    marginBottom: 30,
  },

  preview: {
    height: 255,
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 32,
    flexDirection: 'row',
    overflow: 'hidden',
  },

  previewSidebar: {
    width: 64,
    backgroundColor: '#12324C',
    padding: 8,
  },

  previewLogo: {
    height: 10,
    borderRadius: 3,
    backgroundColor: c.white,
    marginBottom: 15,
  },

  previewNav: {
    height: 8,
    borderRadius: 3,
    backgroundColor: '#315171',
    marginBottom: 10,
  },

  previewMain: {
    flex: 1,
    backgroundColor: '#F5F8FA',
    padding: 10,
  },

  previewTop: {
    height: 16,
    width: '55%',
    backgroundColor: '#D6E0E8',
    borderRadius: 4,
    marginBottom: 12,
  },

  previewStats: {
    flexDirection: 'row',
    gap: 6,
  },

  previewStat: {
    flex: 1,
    height: 43,
    backgroundColor: c.white,
    borderRadius: 6,
  },

  previewLargeRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 8,
  },

  previewMap: {
    flex: 1.4,
    height: 90,
    backgroundColor: '#DFEEEA',
    borderRadius: 6,
  },

  previewPanel: {
    flex: 1,
    height: 90,
    backgroundColor: c.white,
    borderRadius: 6,
  },

  previewBottom: {
    height: 52,
    backgroundColor: c.white,
    borderRadius: 6,
    marginTop: 8,
  },

  websiteHeadline: {
    color: c.navy,
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '800',
    marginBottom: 16,
  },

  websiteBody: {
    color: c.muted,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 30,
  },

  signedInText: {
    color: c.muted,
    fontSize: 10,
    textAlign: 'center',
  },

  muted: {
    color: c.muted,
    fontSize: 12,
  },

  errorBox: {
    backgroundColor: '#FCE9E4',
    borderRadius: 12,
    padding: 13,
    marginBottom: 16,
  },

  errorText: {
    color: c.error,
    fontSize: 12,
  },

  retry: {
    color: authorityBlue,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
  },
});