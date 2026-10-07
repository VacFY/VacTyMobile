import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Aparecer, Boton, Campo, Pantalla, Punto, Seccion, T, Toque, Vacio } from '../components/ui';
import { nombreTermo, separarQr, type Termo } from '../lib/api';
import { mensajeError, useVacty } from '../lib/estado';
import { hace } from '../lib/formato';
import { F, useTema } from '../lib/theme';

const ESTADO = { OK: 'En orden', ALERTA: 'Con alertas', SIN_DATOS: 'Sin datos' } as const;

function FilaTermo({ termo, activo, ultimo, supervisor }: { termo: Termo; activo: boolean; ultimo: boolean; supervisor: boolean }) {
  const t = useTema();
  const { elegirTermo, entregar } = useVacty();
  const color = termo.status === 'ALERTA' ? t.alerta : termo.status === 'SIN_DATOS' ? t.precaucion : t.ok;
  const r = termo.range;

  const confirmarEntrega = () =>
    Alert.alert('Entregar termo', `${nombreTermo(termo)} dejará de estar en tu cuenta y no recibirás sus alertas.`, [
      { text: 'Cancelar' },
      {
        text: 'Entregar',
        style: 'destructive',
        onPress: () => entregar(termo.contenedor).catch((e) => Alert.alert('No se pudo entregar', mensajeError(e))),
      },
    ]);

  return (
    <View style={{ paddingVertical: 16, borderBottomWidth: ultimo ? 0 : StyleSheet.hairlineWidth, borderBottomColor: t.borde, gap: 10 }}>
      <Toque
        onPress={() => {
          elegirTermo(termo.contenedor);
          router.replace('/');
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: activo ? t.primario : 'transparent' }} />
          <View style={{ flex: 1, gap: 3 }}>
            <T v="titulo">{nombreTermo(termo)}</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Punto color={color} />
              <T v="chico" c="sub">
                Código {termo.contenedor} · {ESTADO[termo.status] ?? termo.status}
                {termo.lastReadingAt ? ` · ${hace(termo.lastReadingAt)}` : ''}
              </T>
            </View>
            <T v="chico" c="sub">
              Rango {r.minTemp}–{r.maxTemp} °C · {r.basedOn === 'LOTS' ? 'según sus lotes' : 'perfil estándar'} · {termo.activeLots} lote(s)
            </T>
            {supervisor && (
              <T v="chico" c="sub">{termo.asignadoA ? `Lo tiene ${termo.asignadoA.nombre ?? `DNI ${termo.asignadoA.dni}`}` : termo.registrado === false ? 'Sin registrar' : 'Sin asignar'}</T>
            )}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: F.xbold, fontSize: 26, letterSpacing: -1, color: t.texto }}>
              {termo.temperatura == null ? '--' : termo.temperatura.toFixed(1)}
              <Text style={{ fontFamily: F.bold, fontSize: 14, color: t.sub }}> °C</Text>
            </Text>
          </View>
          {activo && <Ionicons name="checkmark-circle" size={24} color={t.ok} />}
        </View>
      </Toque>
      {!supervisor && (
        <Text onPress={confirmarEntrega} style={{ alignSelf: 'flex-start', marginLeft: 18, fontFamily: F.bold, fontSize: 14, color: t.alerta }}>
          Entregar termo
        </Text>
      )}
    </View>
  );
}

export default function Termos() {
  const { termos, termo, vincular, usuario, recargarTermos, termosListos } = useVacty();
  const supervisor = usuario?.rol === 'SUPERVISOR';
  const [codigo, setCodigo] = useState('');
  const [clave, setClave] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  // Si se pega el texto del QR del termo ("vacty:001:K7P29Q"), se separa en código y clave.
  const cambiar = (campo: 'codigo' | 'clave', valor: string) => {
    const qr = separarQr(valor);
    if (qr) {
      setCodigo(qr.codigo);
      setClave(qr.clave.toUpperCase());
    } else if (campo === 'codigo') setCodigo(valor);
    else setClave(valor.toUpperCase());
    setAviso(null);
  };

  const enviar = async () => {
    setEnviando(true);
    setAviso(null);
    try {
      const texto = await vincular(codigo, clave);
      setAviso({ ok: true, texto });
      setCodigo('');
      setClave('');
    } catch (e) {
      setAviso({ ok: false, texto: mensajeError(e) });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Pantalla
      titulo={supervisor ? 'Termos' : 'Mis termos'}
      subtitulo={supervisor ? 'Todos los termos de la microred. Toca uno para verlo.' : 'Toca un termo para verlo. Entrégalo al terminar tu turno.'}
      atras={!!termo}
      onRefresh={async () => {
        setRefrescando(true);
        await recargarTermos();
        setRefrescando(false);
      }}
      refrescando={refrescando}
    >
      {!supervisor && (
        <Aparecer i={1}>
          <Seccion titulo="Vincular un termo">
            <View style={{ gap: 16 }}>
              <T v="chico" c="sub">Usa el código y la clave impresos en la etiqueta del termo. Si otra enfermera lo tenía, pasa a tu cuenta.</T>
              <Campo icono="cube" etiqueta="Código del termo" placeholder="001" value={codigo} onChangeText={(v) => cambiar('codigo', v)} autoCapitalize="none" autoCorrect={false} />
              <Campo icono="key" etiqueta="Clave" placeholder="XXX-XXX" value={clave} onChangeText={(v) => cambiar('clave', v)} autoCapitalize="characters" autoCorrect={false} />
              {aviso && <T v="chico" c={aviso.ok ? 'ok' : 'alerta'}>{aviso.texto}</T>}
              <Boton titulo={enviando ? 'Vinculando…' : 'Vincular termo'} icono="link" onPress={enviar} deshabilitado={enviando || !codigo.trim() || clave.replace(/[\s-]/g, '').length < 4} />
            </View>
          </Seccion>
        </Aparecer>
      )}

      <Aparecer i={2}>
        <Seccion titulo={supervisor ? `${termos.length} termos` : termos.length === 1 ? 'Tu termo' : `Tus ${termos.length} termos`}>
          {termos.length === 0 ? (
            termosListos ? (
              <Vacio
                icono="cube"
                titulo={supervisor ? 'Aún no hay termos' : 'Aún no tienes termos'}
                texto={supervisor ? 'Registra los termos y entrega sus claves desde el panel web.' : 'Pide a tu supervisor el código y la clave del termo que vas a llevar.'}
              />
            ) : (
              <T v="cuerpo" c="sub">Cargando termos…</T>
            )
          ) : (
            termos.map((x, i) => <FilaTermo key={x.contenedor} termo={x} activo={x.contenedor === termo?.contenedor} ultimo={i === termos.length - 1} supervisor={supervisor} />)
          )}
        </Seccion>
      </Aparecer>
      {supervisor && <T v="chico" c="sub">Para registrar termos, generar claves o desvincular, usa el panel web (vacty.netlify.app).</T>}
    </Pantalla>
  );
}
